import { describeIfCreds, makeDemoClient } from './harness';
import type { CapitalClient } from '../../transport';

describeIfCreds('integration: trading round-trip on demo', () => {
	let client: CapitalClient;
	let epic: string;

	beforeAll(async () => {
		client = makeDemoClient()!;
		const found = (await client.request('GET', '/markets', { qs: { searchTerm: 'gold' } })) as {
			markets?: Array<{ epic: string; marketStatus?: string }>;
		};
		const tradeable = (found.markets ?? []).find((m) => m.marketStatus === 'TRADEABLE');
		epic = (tradeable ?? found.markets?.[0])!.epic;
	});

	it('opens then closes a minimum-size position', async () => {
		const opened = (await client.request('POST', '/positions', {
			body: { epic, direction: 'BUY', size: 1 },
		})) as { dealReference?: string };
		expect(opened.dealReference).toBeTruthy();

		// Give the broker a moment, then find and close the resulting position.
		await new Promise((r) => setTimeout(r, 1500));
		const positions = (await client.request('GET', '/positions')) as {
			positions?: Array<{ position: { dealId: string }; market: { epic: string } }>;
		};
		const mine = (positions.positions ?? []).find((p) => p.market.epic === epic);
		if (mine) {
			const closed = await client.request('DELETE', `/positions/${mine.position.dealId}`);
			expect(closed).toBeDefined();
		}
	});

	it('creates then cancels a working order', async () => {
		// A STOP order far from market so it won't fill.
		const created = (await client.request('POST', '/workingorders', {
			body: { epic, direction: 'BUY', size: 1, type: 'STOP', level: 999999 },
		})) as { dealReference?: string };
		expect(created.dealReference).toBeTruthy();

		await new Promise((r) => setTimeout(r, 1500));
		const orders = (await client.request('GET', '/workingorders')) as {
			workingOrders?: Array<{ workingOrderData: { dealId: string }; marketData: { epic: string } }>;
		};
		const mine = (orders.workingOrders ?? []).find((o) => o.marketData.epic === epic);
		if (mine) {
			const cancelled = await client.request('DELETE', `/workingorders/${mine.workingOrderData.dealId}`);
			expect(cancelled).toBeDefined();
		}
	});
});
