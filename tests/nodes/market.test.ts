import { executeMarket, marketFields } from '../../nodes/CapitalCom/actions/market';
import { FakeClient, fakeExecute } from './helpers';
import type { CapitalClientLike } from '../../nodes/CapitalCom/actions/session';
import type { INodePropertyOptions } from 'n8n-workflow';

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

it('Search with Simplify off → returns the raw response byte-identical to before', async () => {
	const raw = {
		markets: [
			{
				epic: 'GOLD', instrumentName: 'Gold', instrumentType: 'COMMODITIES', marketStatus: 'TRADEABLE',
				bid: 1900, offer: 1901, percentageChange: 0.1, netChange: 1.9, high: 1905, low: 1895,
				lotSize: 1, delayTime: 0,
			},
		],
	};
	const { promise } = run(
		{ operation: 'search', searchTerm: '', epics: '', limit: 50, simple: false },
		{ 'GET /markets': raw },
	);
	await expect(promise).resolves.toEqual(raw);
});

it('Search with Simplify on → returns the mapped shape', async () => {
	const raw = {
		markets: [
			{
				epic: 'GOLD', instrumentName: 'Gold', instrumentType: 'COMMODITIES', marketStatus: 'TRADEABLE',
				bid: 1900, offer: 1901, percentageChange: 0.1, netChange: 1.9, high: 1905, low: 1895,
				lotSize: 1, delayTime: 0,
			},
		],
	};
	const { promise } = run(
		{ operation: 'search', searchTerm: '', epics: '', limit: 50, simple: true },
		{ 'GET /markets': raw },
	);
	await expect(promise).resolves.toEqual({
		markets: [
			{
				epic: 'GOLD', instrumentName: 'Gold', instrumentType: 'COMMODITIES', marketStatus: 'TRADEABLE',
				bid: 1900, offer: 1901, percentageChange: 0.1, netChange: 1.9, high: 1905, low: 1895,
			},
		],
	});
});

it('Get → GET /markets/{epic} (url-encoded)', async () => {
	const { client, promise } = run({ operation: 'get', epic: 'GOLD' });
	await promise;
	expect(client.calls[0].args.slice(0, 2)).toEqual(['GET', '/markets/GOLD']);
});

it('Get with Simplify off → returns the raw response byte-identical to before', async () => {
	const raw = {
		instrument: { epic: 'SILVER', name: 'Silver', type: 'COMMODITIES', lotSize: 1 },
		dealingRules: { minDealSize: { unit: 'POINTS', value: 0.1 } },
		snapshot: { marketStatus: 'TRADEABLE', bid: 24.2, offer: 24.22, high: 24.4, low: 24.19 },
	};
	const { promise } = run({ operation: 'get', epic: 'SILVER', simple: false }, { 'GET /markets/SILVER': raw });
	await expect(promise).resolves.toEqual(raw);
});

it('Get with Simplify on → returns the mapped shape (nested instrument/snapshot flattened)', async () => {
	const raw = {
		instrument: { epic: 'SILVER', name: 'Silver', type: 'COMMODITIES', lotSize: 1 },
		dealingRules: { minDealSize: { unit: 'POINTS', value: 0.1 } },
		snapshot: {
			marketStatus: 'TRADEABLE', bid: 24.2, offer: 24.22, high: 24.4, low: 24.19,
			netChange: -0.1, percentageChange: -0.4,
		},
	};
	const { promise } = run(
		{ operation: 'get', epic: 'SILVER', simple: true },
		{ 'GET /markets/SILVER': raw },
	);
	await expect(promise).resolves.toEqual({
		epic: 'SILVER', instrumentName: 'Silver', instrumentType: 'COMMODITIES',
		marketStatus: 'TRADEABLE', bid: 24.2, offer: 24.22, high: 24.4, low: 24.19,
		netChange: -0.1, percentageChange: -0.4,
	});
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
	await expect(promise).rejects.toThrow(/no market ids were given/i);
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

it('Resolution options stay alphabetized by name and keep their exact value set', () => {
	const resolution = marketFields.find((f) => f.name === 'resolution');
	const options = resolution?.options as INodePropertyOptions[];
	expect(options).toBeDefined();

	// Guards the fix for n8n-nodes-base/node-param-options-type-unsorted-items: the scanner
	// re-lints with inline eslint-disable comments stripped, so this list must be genuinely
	// alphabetical by `name` (locale compare), not just "shortest to longest".
	const names = options.map((o) => o.name);
	const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
	expect(names).toEqual(sortedNames);

	// A reorder or relabel must never change which values a workflow can select.
	const values = options.map((o) => o.value).sort();
	expect(values).toEqual(
		['DAY', 'HOUR', 'HOUR_4', 'MINUTE', 'MINUTE_15', 'MINUTE_30', 'MINUTE_5', 'WEEK'].sort(),
	);
});
