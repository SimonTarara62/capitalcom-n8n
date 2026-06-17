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

const PING_INTERVAL_MS = 8 * 60 * 1000; // session expires ~10 min; ping well inside that
const RECONNECT_DELAY_MS = 2000;

function parseCsv(raw: string): string[] {
	return raw
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
}

export class CapitalComTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Capital.com Trigger',
		name: 'capitalComTrigger',
		icon: 'file:capitalcom.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["stream"]}}',
		description: 'Stream live Capital.com market data over WebSocket',
		defaults: { name: 'Capital.com Trigger' },
		inputs: [],
		outputs: ['main'],
		credentials: [{ name: 'capitalComApi', required: true }],
		properties: [
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

		let socket: WebSocket | undefined;
		let pingTimer: NodeJS.Timeout | undefined;
		let closed = false;

		const connect = async (): Promise<void> => {
			const client = await createClient(this);
			const session = await client.ensureLoggedIn();
			const tokens: WsTokens = { cst: session.cst, securityToken: session.xSecurityToken };

			socket = new WebSocket(WS_URL, {
				headers: { CST: tokens.cst, 'X-SECURITY-TOKEN': tokens.securityToken },
			});

			socket.on('open', () => {
				socket?.send(JSON.stringify(buildSubscribeForStream(stream, epics, resolutions, tokens)));
				pingTimer = setInterval(() => {
					try {
						socket?.send(JSON.stringify(buildPing(tokens)));
					} catch {
						/* ping failure is non-fatal; a drop will trigger reconnect */
					}
				}, PING_INTERVAL_MS);
			});

			socket.on('message', (data: WebSocket.RawData) => {
				const message = selectEmit(data.toString(), emitAll);
				if (message) this.emit([this.helpers.returnJsonArray([message as IDataObject])]);
			});

			socket.on('close', () => {
				if (pingTimer) clearInterval(pingTimer);
				if (!closed) {
					setTimeout(() => {
						connect().catch(() => {
							/* reconnect failed; the next close/timer cycle retries */
						});
					}, RECONNECT_DELAY_MS);
				}
			});

			socket.on('error', () => {
				// 'error' is followed by 'close', which handles reconnect.
			});
		};

		await connect();

		const closeFunction = async (): Promise<void> => {
			closed = true;
			if (pingTimer) clearInterval(pingTimer);
			socket?.close();
		};

		return { closeFunction };
	}
}
