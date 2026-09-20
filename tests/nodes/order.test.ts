import { executeOrder } from '../../nodes/CapitalCom/actions/order';
import { FakeClient, fakeExecute } from './helpers';
import type { CapitalClientLike } from '../../nodes/CapitalCom/actions/session';

function run(params: Record<string, unknown>, responses: Record<string, unknown> = {}) {
	const client = new FakeClient(responses);
	const ctx = fakeExecute({ params });
	return { client, promise: executeOrder(client as unknown as CapitalClientLike, ctx, 0) };
}

it('List → GET /workingorders, truncates to limit', async () => {
	const { client, promise } = run(
		{ operation: 'list', limit: 1 },
		{ 'GET /workingorders': { workingOrders: [{ a: 1 }, { a: 2 }] } },
	);
	const out = (await promise) as { workingOrders: unknown[] };
	expect(client.calls[0].args.slice(0, 2)).toEqual(['GET', '/workingorders']);
	expect(out.workingOrders).toHaveLength(1);
});

it('List with Simplify off (default) → returns the raw response byte-identical to before', async () => {
	const raw = {
		workingOrders: [
			{
				workingOrderData: {
					dealId: 'w1', direction: 'BUY', orderSize: 1, orderLevel: 999999, orderType: 'STOP',
					currencyCode: 'USD', stopDistance: -3, profitDistance: 3, createdDateUTC: 't',
					guaranteedStop: false,
				},
				marketData: { epic: 'SILVER', instrumentName: 'Silver', marketStatus: 'TRADEABLE', lotSize: 1 },
			},
		],
	};
	const { promise } = run({ operation: 'list', limit: 50 }, { 'GET /workingorders': raw });
	await expect(promise).resolves.toEqual(raw);
});

it('List with Simplify on → returns the mapped shape', async () => {
	const raw = {
		workingOrders: [
			{
				workingOrderData: {
					dealId: 'w1', direction: 'BUY', orderSize: 1, orderLevel: 999999, orderType: 'STOP',
					currencyCode: 'USD', stopDistance: -3, profitDistance: 3, createdDateUTC: 't',
					guaranteedStop: false,
				},
				marketData: { epic: 'SILVER', instrumentName: 'Silver', marketStatus: 'TRADEABLE', lotSize: 1 },
			},
		],
	};
	const { promise } = run(
		{ operation: 'list', limit: 50, simple: true },
		{ 'GET /workingorders': raw },
	);
	await expect(promise).resolves.toEqual({
		workingOrders: [
			{
				dealId: 'w1', direction: 'BUY', orderSize: 1, orderLevel: 999999, orderType: 'STOP',
				currencyCode: 'USD', stopDistance: -3, profitDistance: 3, createdDateUTC: 't',
				epic: 'SILVER', instrumentName: 'Silver', marketStatus: 'TRADEABLE',
			},
		],
	});
});

it('Preview → returns the order request body, sends nothing', async () => {
	const { client, promise } = run({
		operation: 'preview', epic: 'GOLD', direction: 'BUY', size: 1, orderType: 'LIMIT', level: 1900, stopsLimits: {},
	});
	const out = (await promise) as { preview: boolean; request: Record<string, unknown> };
	expect(out.request).toEqual({ epic: 'GOLD', direction: 'BUY', size: 1, type: 'LIMIT', level: 1900 });
	expect(client.calls).toHaveLength(0);
});

it('Create → POST /workingorders with built body', async () => {
	const { client, promise } = run(
		{ operation: 'create', epic: 'GOLD', direction: 'BUY', size: 1, orderType: 'STOP', level: 2000, stopsLimits: {}, dryRun: false, waitForConfirmation: false },
		{ 'POST /workingorders': { dealReference: 'R2' } },
	);
	await promise;
	expect(client.calls[0].args).toEqual([
		'POST',
		'/workingorders',
		{ body: { epic: 'GOLD', direction: 'BUY', size: 1, type: 'STOP', level: 2000 } },
	]);
});

it('Create → allowed-epics guard blocks before sending', async () => {
	const { client, promise } = run({
		operation: 'create', epic: 'GOLD', direction: 'BUY', size: 1, orderType: 'LIMIT', level: 1, stopsLimits: {}, dryRun: false, allowedEpics: 'SILVER',
	});
	await expect(promise).rejects.toThrow(/not in the allowed epics/i);
	expect(client.calls).toHaveLength(0);
});

it('Amend → PUT /workingorders/{dealId} with stops/limits + optional level', async () => {
	const { client, promise } = run({
		operation: 'amend', dealId: 'D2', level: 2050, goodTillDate: '', stopsLimits: { stopDistance: 30 },
	});
	await promise;
	expect(client.calls[0].args).toEqual(['PUT', '/workingorders/D2', { body: { stopDistance: 30, level: 2050 } }]);
});

it('Cancel → DELETE /workingorders/{dealId}', async () => {
	const { client, promise } = run({ operation: 'cancel', dealId: 'D2' });
	await promise;
	expect(client.calls[0].args.slice(0, 2)).toEqual(['DELETE', '/workingorders/D2']);
});
