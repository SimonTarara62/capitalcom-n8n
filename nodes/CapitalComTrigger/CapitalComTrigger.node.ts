import {
	sleepWithAbort,
	type IDataObject,
	type INodeType,
	type INodeTypeDescription,
	type ITriggerFunctions,
	type ITriggerResponse,
} from 'n8n-workflow';

import { WS_URL } from '../../transport';
import {
	assertEpicCount,
	buildPing,
	buildSubscribeForStream,
	selectEmit,
	type StreamKind,
	type WsTokens,
} from '../../transport/wsProtocol';
import { createClient } from '../CapitalCom/transport';

// session expires ~10 min; ping well inside that — constant kept here for module-level visibility
export const PING_INTERVAL_MS = 8 * 60 * 1000;

const textDecoder = new TextDecoder();

function parseCsv(raw: string): string[] {
	return raw
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
}

/**
 * sleepWithAbort attaches an 'abort' listener to the signal it is handed and never
 * removes it when the timer resolves normally, so a long-lived signal collects one
 * dead listener per sleep (a ping every 8 minutes, for the life of a connection).
 * Giving it a throwaway controller per call keeps those listeners on a signal that
 * is garbage straight after, and the single listener we own is always detached.
 *
 * Resolves true when the full delay elapsed, false when `signal` aborted first.
 */
async function sleepUnlessAborted(ms: number, signal: AbortSignal): Promise<boolean> {
	if (signal.aborted) return false;
	const timer = new AbortController();
	const onAbort = (): void => timer.abort();
	signal.addEventListener('abort', onAbort, { once: true });
	try {
		await sleepWithAbort(ms, timer.signal);
		return !signal.aborted;
	} catch {
		return false; // aborted while sleeping
	} finally {
		signal.removeEventListener('abort', onAbort);
	}
}

/** The native 'error' event is an ErrorEvent: the detail is on .error, while .message is empty. */
function describeSocketError(event: unknown): string {
	const cause = (event as { error?: unknown } | null | undefined)?.error;
	if (cause instanceof Error) return cause.message;
	if (typeof cause === 'string' && cause) return cause;
	const message = (event as { message?: unknown } | null | undefined)?.message;
	if (typeof message === 'string' && message) return message;
	return cause === undefined || cause === null ? 'no detail available' : String(cause);
}

/**
 * Close code and reason off a CloseEvent. Telling an auth rejection apart from a
 * 1006 transport drop is the whole diagnosis when a live stream goes quiet.
 */
function describeSocketClose(event: unknown): string {
	const code = (event as { code?: unknown } | null | undefined)?.code;
	const reason = (event as { reason?: unknown } | null | undefined)?.reason;
	const codeText = typeof code === 'number' ? String(code) : 'unknown';
	const reasonText = typeof reason === 'string' && reason ? ` ${reason}` : '';
	return `code ${codeText}${reasonText}`;
}

/** Decode a frame's payload. Binary frames arrive as ArrayBuffer once binaryType is set. */
function decodeFrame(data: unknown): string | null {
	if (typeof data === 'string') return data;
	if (data instanceof ArrayBuffer) return textDecoder.decode(data);
	// TextDecoder accepts any view at runtime; the cast just picks one of its overloads.
	if (ArrayBuffer.isView(data)) return textDecoder.decode(data as Uint8Array);
	return null;
}

export class CapitalComTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Capital.com (Unofficial) Trigger',
		name: 'capitalComTrigger',
		icon: 'file:capitalcom.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["stream"]}}',
		description: 'Stream live Capital.com market data over WebSocket',
		documentationUrl: 'https://github.com/SimonTarara62/capitalcom-n8n',
		defaults: { name: 'Capital.com (Unofficial) Trigger' },
		inputs: [],
		outputs: ['main'],
		credentials: [{ name: 'capitalComApi', required: true }],
		properties: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				displayName:
					'Unofficial community node — not affiliated with, endorsed by, or supported by Capital.com. Beta software; start with a demo account.',
				name: 'unofficialNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Stream',
				name: 'stream',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Candles', value: 'candles', description: 'OHLC candlestick updates' },
					{ name: 'Prices', value: 'prices', description: 'Live quote/tick updates' },
				],
				default: 'prices',
			},
			{
				displayName: 'EPICs',
				name: 'epics',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'GOLD,SILVER',
				description: 'Comma-separated market EPICs to subscribe to (max 40)',
			},
			{
				displayName: 'Resolutions',
				name: 'resolutions',
				type: 'string',
				default: 'MINUTE',
				displayOptions: { show: { stream: ['candles'] } },
				description: 'Comma-separated candle resolutions (e.g. MINUTE, MINUTE_5, HOUR)',
			},
			{
				displayName: 'Emit All Messages',
				name: 'emitAllMessages',
				type: 'boolean',
				default: false,
				description: 'Whether to emit control messages (acks, ping replies) in addition to data',
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const stream = this.getNodeParameter('stream') as StreamKind;
		const epics = parseCsv(this.getNodeParameter('epics') as string);
		assertEpicCount(epics);
		const resolutions =
			stream === 'candles' ? parseCsv(this.getNodeParameter('resolutions', 'MINUTE') as string) : [];
		const emitAll = this.getNodeParameter('emitAllMessages', false) as boolean;

		const RECONNECT_BASE_MS = 2000;
		const RECONNECT_MAX_MS = 60_000;

		// One controller for the whole trigger lifetime. Aborting it detaches every
		// listener and breaks every background loop that is already running — but it
		// cannot by itself stop a connect() parked on the login round trip, so
		// connect() re-checks the signal after every await as well.
		const lifetime = new AbortController();
		let socket: WebSocket | undefined;
		let connection: AbortController | undefined;
		let attempts = 0;

		/** Drop the current connection: detach its listeners, stop its ping loop, close its socket. */
		const supersede = (): void => {
			const previousSocket = socket;
			const previousConnection = connection;
			socket = undefined;
			connection = undefined;
			previousConnection?.abort(); // detach listeners first, so close() cannot re-enter them
			try {
				previousSocket?.close();
			} catch {
				/* already gone */
			}
		};

		const pingLoop = async (ws: WebSocket, tokens: WsTokens, signal: AbortSignal): Promise<void> => {
			for (;;) {
				if (!(await sleepUnlessAborted(PING_INTERVAL_MS, signal))) return;
				if (socket !== ws) return;
				try {
					ws.send(JSON.stringify(buildPing(tokens)));
				} catch {
					return; // the socket died — 'close' drives the reconnect
				}
			}
		};

		const scheduleReconnect = async (): Promise<void> => {
			if (lifetime.signal.aborted) return;
			const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempts, RECONNECT_MAX_MS);
			attempts += 1;
			if (!(await sleepUnlessAborted(delay, lifetime.signal))) return;
			await connect().catch((error) => {
				this.logger.warn(`Capital.com Trigger reconnect failed: ${(error as Error).message}`);
				void scheduleReconnect();
			});
		};

		const connect = async (): Promise<void> => {
			if (lifetime.signal.aborted) return;

			// Supersede anything still live before opening a new socket. A duplicate
			// authenticated connection to a broker is worse than a missed reconnect.
			supersede();

			// Every await below is a window in which closeFunction() can run, so the
			// lifetime signal is re-checked after each one.
			const client = await createClient(this);
			if (lifetime.signal.aborted) return;
			const session = await client.ensureLoggedIn();
			if (lifetime.signal.aborted) return;
			const tokens: WsTokens = { cst: session.cst, securityToken: session.xSecurityToken };

			// Per-connection controller, chained to the trigger lifetime. Capital.com
			// authenticates every message (cst + securityToken travel in each payload),
			// so the native WebSocket's inability to set handshake headers is harmless.
			const conn = new AbortController();
			if (lifetime.signal.aborted) {
				conn.abort();
				return;
			}
			// { signal: conn.signal } detaches the chaining listener when this connection
			// ends, instead of leaving one on lifetime.signal per reconnect forever.
			lifetime.signal.addEventListener('abort', () => conn.abort(), {
				once: true,
				signal: conn.signal,
			});

			const ws = new WebSocket(WS_URL);
			ws.binaryType = 'arraybuffer'; // undici defaults to 'blob', which stringifies to "[object Blob]"
			socket = ws;
			connection = conn;

			ws.addEventListener(
				'open',
				() => {
					if (socket !== ws) return; // stale socket from a superseded connect()
					attempts = 0; // reset backoff after a successful connection
					ws.send(JSON.stringify(buildSubscribeForStream(stream, epics, resolutions, tokens)));
					void pingLoop(ws, tokens, conn.signal);
				},
				{ signal: conn.signal },
			);

			ws.addEventListener(
				'message',
				(event) => {
					if (socket !== ws) return;
					const raw = decodeFrame((event as MessageEvent).data);
					if (raw === null) {
						this.logger.warn('Capital.com Trigger dropped a frame in an unsupported format');
						return;
					}
					const message = selectEmit(raw, emitAll);
					if (message) this.emit([this.helpers.returnJsonArray([message as IDataObject])]);
				},
				{ signal: conn.signal },
			);

			ws.addEventListener(
				'close',
				(event) => {
					if (socket !== ws) return;
					this.logger.warn(`Capital.com Trigger socket closed (${describeSocketClose(event)})`);
					socket = undefined;
					connection = undefined;
					conn.abort(); // stops this connection's ping loop and detaches its listeners
					if (!lifetime.signal.aborted) void scheduleReconnect();
				},
				{ signal: conn.signal },
			);

			ws.addEventListener(
				'error',
				(event) => {
					if (socket === ws) {
						this.logger.warn(`Capital.com Trigger socket error: ${describeSocketError(event)}`);
					}
					// 'error' is followed by 'close', which handles the reconnect.
				},
				{ signal: conn.signal },
			);
		};

		await connect();

		const closeFunction = async (): Promise<void> => {
			lifetime.abort(); // cancels the ping loop, the backoff, and any in-flight connect()
			supersede(); // and closes the socket that is open right now, if any
		};

		return { closeFunction };
	}
}
