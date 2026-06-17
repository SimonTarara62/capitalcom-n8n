import {
	type IDataObject,
	type INodeType,
	type INodeTypeDescription,
	type ITriggerFunctions,
	type ITriggerResponse,
} from 'n8n-workflow';
import WebSocket from 'ws';

import { WS_URL } from '../../transport';
import { assertEpicCount, buildPing, buildSubscribeForStream, selectEmit, type StreamKind, type WsTokens } from '../../transport/wsProtocol';
import { createClient } from '../CapitalCom/transport';

// session expires ~10 min; ping well inside that — constant kept here for module-level visibility
const PING_INTERVAL_MS = 8 * 60 * 1000;

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
					'Unofficial community node — not affiliated with, endorsed by, or supported by Capital.com. Alpha software; start with a demo account.',
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

		let socket: WebSocket | undefined;
		let pingTimer: NodeJS.Timeout | undefined;
		let reconnectTimer: NodeJS.Timeout | undefined;
		let attempts = 0;
		let closed = false;

		const clearPing = () => {
			if (pingTimer) {
				clearInterval(pingTimer);
				pingTimer = undefined;
			}
		};

		const teardownSocket = () => {
			clearPing();
			if (socket) {
				socket.removeAllListeners();
				try {
					socket.terminate();
				} catch {
					/* already gone */
				}
				socket = undefined;
			}
		};

		const scheduleReconnect = () => {
			if (closed) return;
			const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempts, RECONNECT_MAX_MS);
			attempts += 1;
			reconnectTimer = setTimeout(() => {
				connect().catch((error) => {
					this.logger.warn(`Capital.com Trigger reconnect failed: ${(error as Error).message}`);
					scheduleReconnect();
				});
			}, delay);
		};

		const connect = async (): Promise<void> => {
			if (closed) return;
			teardownSocket();

			const client = await createClient(this);
			const session = await client.ensureLoggedIn();
			const tokens: WsTokens = { cst: session.cst, securityToken: session.xSecurityToken };

			const ws = new WebSocket(WS_URL, {
				headers: { CST: tokens.cst, 'X-SECURITY-TOKEN': tokens.securityToken },
			});
			socket = ws;

			ws.on('open', () => {
				if (socket !== ws) return; // stale socket from a superseded connect()
				attempts = 0; // reset backoff after a successful connection
				ws.send(JSON.stringify(buildSubscribeForStream(stream, epics, resolutions, tokens)));
				pingTimer = setInterval(() => {
					try {
						ws.send(JSON.stringify(buildPing(tokens)));
					} catch {
						/* a send failure will surface as a close → reconnect */
					}
				}, PING_INTERVAL_MS);
			});

			ws.on('message', (data: WebSocket.RawData) => {
				if (socket !== ws) return;
				const message = selectEmit(data.toString(), emitAll);
				if (message) this.emit([this.helpers.returnJsonArray([message as IDataObject])]);
			});

			ws.on('close', () => {
				if (socket !== ws) return;
				clearPing();
				if (!closed) scheduleReconnect();
			});

			ws.on('error', (error: Error) => {
				if (socket === ws) {
					this.logger.warn(`Capital.com Trigger socket error: ${error.message}`);
				}
				// 'error' is followed by 'close', which handles reconnect.
			});
		};

		await connect();

		const closeFunction = async (): Promise<void> => {
			closed = true;
			if (reconnectTimer) clearTimeout(reconnectTimer);
			teardownSocket();
		};

		return { closeFunction };
	}
}
