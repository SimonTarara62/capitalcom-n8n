import WebSocket from 'ws';
import { WS_URL } from '../../transport';
import { buildQuoteSubscribe, selectEmit, type WsTokens } from '../../transport/wsProtocol';
import { describeIfCreds, makeDemoClient } from './harness';

describeIfCreds('integration: live price stream', () => {
	it('receives a quote for a tradeable epic', async () => {
		const client = makeDemoClient()!;
		const session = await client.ensureLoggedIn();
		const tokens: WsTokens = { cst: session.cst, securityToken: session.xSecurityToken };

		const found = (await client.request('GET', '/markets', { qs: { searchTerm: 'gold' } })) as {
			markets?: Array<{ epic: string; marketStatus?: string }>;
		};
		const market = (found.markets ?? []).find((m) => m.marketStatus === 'TRADEABLE') ?? found.markets?.[0];
		const epic = market!.epic;

		const message = await new Promise<unknown>((resolve, reject) => {
			const ws = new WebSocket(WS_URL, {
				headers: { CST: tokens.cst, 'X-SECURITY-TOKEN': tokens.securityToken },
			});
			const timer = setTimeout(() => {
				ws.close();
				reject(new Error('No quote within 20s — the market may be closed; run during market hours'));
			}, 20_000);
			ws.on('open', () => ws.send(JSON.stringify(buildQuoteSubscribe([epic], tokens))));
			ws.on('message', (data: WebSocket.RawData) => {
				const emit = selectEmit(data.toString(), false);
				if (emit) {
					clearTimeout(timer);
					ws.close();
					resolve(emit);
				}
			});
			ws.on('error', (err) => {
				clearTimeout(timer);
				reject(err);
			});
		});

		expect(message).toBeDefined();
		expect((message as { destination?: string }).destination).toBe('quote');
	}, 25_000);
});
