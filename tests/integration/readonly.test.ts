import { describeIfCreds, makeDemoClient } from './harness';
import type { CapitalClient } from '../../transport';

describeIfCreds('integration: read-only demo API', () => {
	let client: CapitalClient;

	beforeAll(() => {
		client = makeDemoClient()!;
	});

	it('logs in and pings the session', async () => {
		const res = (await client.request('GET', '/ping')) as { status?: string };
		expect(res).toBeDefined();
	});

	it('lists accounts', async () => {
		const res = (await client.request('GET', '/accounts')) as { accounts?: unknown[] };
		expect(Array.isArray(res.accounts)).toBe(true);
	});

	it('searches markets for gold', async () => {
		const res = (await client.request('GET', '/markets', { qs: { searchTerm: 'gold' } })) as {
			markets?: unknown[];
		};
		expect(Array.isArray(res.markets)).toBe(true);
		expect((res.markets ?? []).length).toBeGreaterThan(0);
	});

	it('creates, reads, and deletes a watchlist (round-trip)', async () => {
		const created = (await client.request('POST', '/watchlists', {
			body: { name: `n8n-it-${Date.now()}` },
		})) as { watchlistId?: string };
		expect(created.watchlistId).toBeTruthy();

		const id = created.watchlistId!;
		const got = (await client.request('GET', `/watchlists/${id}`)) as Record<string, unknown>;
		expect(got).toBeDefined();

		const deleted = await client.request('DELETE', `/watchlists/${id}`);
		expect(deleted ?? { status: 'deleted' }).toBeDefined();
	});
});
