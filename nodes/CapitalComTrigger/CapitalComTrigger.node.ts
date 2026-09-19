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

function parseCsv(raw: string): string[] {
	return raw
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
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
		// listener and breaks every background loop in a single step, so closeFunction
		// cannot leave a ping or reconnect running.
		const lifetime = new AbortController();
		let socket: WebSocket | undefined;
		let attempts = 0;

		const pingLoop = async (ws: WebSocket, tokens: WsTokens, signal: AbortSignal): Promise<void> => {
			try {
				for (;;) {
					await sleepWithAbort(PING_INTERVAL_MS, signal);
					if (signal.aborted || socket !== ws) return;
					ws.send(JSON.stringify(buildPing(tokens)));
				}
			} catch {
				/* aborted, or the socket died — 'close' drives the reconnect */
			}
		};

		const scheduleReconnect = async (): Promise<void> => {
			if (lifetime.signal.aborted) return;
			const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempts, RECONNECT_MAX_MS);
			attempts += 1;
			try {
				await sleepWithAbort(delay, lifetime.signal);
			} catch {
				return; // aborted while backing off
			}
			if (lifetime.signal.aborted) return;
			await connect().catch((error) => {
				this.logger.warn(`Capital.com Trigger reconnect failed: ${(error as Error).message}`);
				void scheduleReconnect();
			});
		};

		const connect = async (): Promise<void> => {
			if (lifetime.signal.aborted) return;

			const client = await createClient(this);
			const session = await client.ensureLoggedIn();
			const tokens: WsTokens = { cst: session.cst, securityToken: session.xSecurityToken };

			// Per-connection controller, chained to the trigger lifetime. Capital.com
			// authenticates every message (cst + securityToken travel in each payload),
			// so the native WebSocket's inability to set handshake headers is harmless.
			const conn = new AbortController();
			lifetime.signal.addEventListener('abort', () => conn.abort(), { once: true });

			const ws = new WebSocket(WS_URL);
			socket = ws;

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
					const message = selectEmit(String((event as MessageEvent).data), emitAll);
					if (message) this.emit([this.helpers.returnJsonArray([message as IDataObject])]);
				},
				{ signal: conn.signal },
			);

			ws.addEventListener(
				'close',
				() => {
					if (socket !== ws) return;
					conn.abort(); // stops this connection's ping loop
					if (!lifetime.signal.aborted) void scheduleReconnect();
				},
				{ signal: conn.signal },
			);

			ws.addEventListener(
				'error',
				() => {
					if (socket === ws) {
						this.logger.warn('Capital.com Trigger socket error');
					}
					// 'error' is followed by 'close', which handles the reconnect.
				},
				{ signal: conn.signal },
			);
		};

		await connect();

		const closeFunction = async (): Promise<void> => {
			lifetime.abort(); // detaches all listeners and cancels ping + reconnect
			const ws = socket;
			socket = undefined;
			try {
				ws?.close();
			} catch {
				/* already gone */
			}
		};

		return { closeFunction };
	}
}
