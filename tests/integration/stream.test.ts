import { sleepWithAbort } from 'n8n-workflow';
import { WS_URL } from '../../transport';
import { buildQuoteSubscribe, selectEmit, type WsTokens } from '../../transport/wsProtocol';
import { describeIfCreds, makeDemoClient } from './harness';

const textDecoder = new TextDecoder();

/** Decode a frame the way the trigger node does — binary frames arrive as ArrayBuffer. */
function decodeFrame(data: unknown): string {
	if (typeof data === 'string') return data;
	if (data instanceof ArrayBuffer) return textDecoder.decode(data);
	if (ArrayBuffer.isView(data)) return textDecoder.decode(data as Uint8Array);
	return '';
}

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

		// The native global WebSocket cannot set handshake headers — and does not need to:
		// Capital.com authenticates every message, so cst/securityToken travel inside the
		// subscribe payload. This is the exact headerless path the trigger node now takes,
		// which is the whole point of running this against a live demo account.
		const ws = new WebSocket(WS_URL);
		ws.binaryType = 'arraybuffer';
		const settled = new AbortController();

		try {
			const message = await new Promise<unknown>((resolve, reject) => {
				void sleepWithAbort(20_000, settled.signal).then(
					() =>
						reject(
							new Error('No quote within 20s — the market may be closed; run during market hours'),
						),
					() => {
						/* cancelled because the socket settled first */
					},
				);

				ws.addEventListener('open', () =>
					ws.send(JSON.stringify(buildQuoteSubscribe([epic], tokens))),
				);

				ws.addEventListener('message', (event) => {
					const emit = selectEmit(decodeFrame((event as MessageEvent).data), false);
					if (emit) {
						settled.abort();
						resolve(emit);
					}
				});

				ws.addEventListener('error', (event) => {
					settled.abort();
					const cause = (event as { error?: unknown } | null | undefined)?.error;
					reject(new Error(`WebSocket error: ${cause instanceof Error ? cause.message : String(cause)}`));
				});
			});

			expect(message).toBeDefined();
			expect((message as { destination?: string }).destination).toBe('quote');
		} finally {
			settled.abort();
			ws.close();
		}
	}, 25_000);
});
