import { executeMarket } from '../../nodes/CapitalCom/actions/market';
import { FakeClient, fakeExecute } from './helpers';
import type { CapitalClientLike } from '../../nodes/CapitalCom/actions/session';

function run(params: Record<string, unknown>, responses: Record<string, unknown> = {}) {
	const client = new FakeClient(responses);
	const ctx = fakeExecute({ params });
	return { client, promise: executeMarket(client as unknown as CapitalClientLike, ctx, 0) };
}

it('Search → GET /markets with qs, truncates markets to limit', async () => {
	const { client, promise } = run(
		{ operation: 'search', searchTerm: 'gold', epics: '', limit: 2 },
		{ 'GET /markets': { markets: [{ a: 1 }, { a: 2 }, { a: 3 }] } },
	);
	const out = (await promise) as { markets: unknown[] };
	expect(out.markets).toHaveLength(2);
	expect(client.calls[0].args).toEqual(['GET', '/markets', { qs: { searchTerm: 'gold' } }]);
});

it('Get → GET /markets/{epic} (url-encoded)', async () => {
	const { client, promise } = run({ operation: 'get', epic: 'GOLD' });
	await promise;
	expect(client.calls[0].args.slice(0, 2)).toEqual(['GET', '/markets/GOLD']);
});

it('Get Prices → GET /prices/{epic} with resolution/max and optional from/to', async () => {
	const { client, promise } = run({
		operation: 'getPrices',
		epic: 'GOLD',
		resolution: 'HOUR',
		maxCandles: 50,
		from: '2026-01-01T00:00:00',
		to: '',
	});
	await promise;
	expect(client.calls[0].args).toEqual([
		'GET',
		'/prices/GOLD',
		{ qs: { resolution: 'HOUR', max: 50, from: '2026-01-01T00:00:00' } },
	]);
});

it('Get Sentiment → single id uses path form', async () => {
	const { client, promise } = run({ operation: 'getSentiment', marketIds: 'GOLD' });
	await promise;
	expect(client.calls[0].args.slice(0, 2)).toEqual(['GET', '/clientsentiment/GOLD']);
});

it('Get Sentiment → many ids use batch query', async () => {
	const { client, promise } = run({ operation: 'getSentiment', marketIds: 'GOLD, SILVER' });
	await promise;
	expect(client.calls[0].args).toEqual([
		'GET',
		'/clientsentiment',
		{ qs: { marketIds: 'GOLD,SILVER' } },
	]);
});

it('Get Sentiment → empty/whitespace marketIds rejects with a descriptive error', async () => {
	const { promise } = run({ operation: 'getSentiment', marketIds: '   ' });
	await expect(promise).rejects.toThrow(/at least one market id/i);
});

it('Navigation Root → GET /marketnavigation', async () => {
	const { client, promise } = run({ operation: 'navigationRoot' });
	await promise;
	expect(client.calls[0].args.slice(0, 2)).toEqual(['GET', '/marketnavigation']);
});

it('Navigation Node → GET /marketnavigation/{nodeId} with limit', async () => {
	const { client, promise } = run({ operation: 'navigationNode', nodeId: 'hierarchy_v1', limit: 10 });
	await promise;
	expect(client.calls[0].args).toEqual([
		'GET',
		'/marketnavigation/hierarchy_v1',
		{ qs: { limit: 10 } },
	]);
});
