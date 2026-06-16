import { executeAccount } from '../../nodes/CapitalCom/actions/account';
import { FakeClient, fakeExecute } from './helpers';
import type { CapitalClientLike } from '../../nodes/CapitalCom/actions/session';

function run(
	params: Record<string, unknown>,
	opts: { credentials?: Record<string, unknown>; responses?: Record<string, unknown> } = {},
) {
	const client = new FakeClient(opts.responses ?? {});
	const ctx = fakeExecute({ params, credentials: opts.credentials });
	return { client, promise: executeAccount(client as unknown as CapitalClientLike, ctx, 0) };
}

it('List → GET /accounts', async () => {
	const { client, promise } = run({ operation: 'list' });
	await promise;
	expect(client.calls[0].args.slice(0, 2)).toEqual(['GET', '/accounts']);
});

it('Get Preferences → GET /accounts/preferences', async () => {
	const { client, promise } = run({ operation: 'getPreferences' });
	await promise;
	expect(client.calls[0].args.slice(0, 2)).toEqual(['GET', '/accounts/preferences']);
});

it('Set Preferences → PUT with hedging boolean + parsed leverages, omits "no change"', async () => {
	const { client, promise } = run({
		operation: 'setPreferences',
		hedgingMode: 'enabled',
		leverages: '{"CURRENCIES": 20}',
	});
	await promise;
	expect(client.calls[0].args).toEqual([
		'PUT',
		'/accounts/preferences',
		{ body: { hedgingMode: true, leverages: { CURRENCIES: 20 } } },
	]);
});

it('Set Preferences → empty body when nothing changed', async () => {
	const { client, promise } = run({ operation: 'setPreferences', hedgingMode: 'noChange', leverages: '' });
	await promise;
	expect(client.calls[0].args).toEqual(['PUT', '/accounts/preferences', { body: {} }]);
});

it('Set Preferences → rejects invalid leverages JSON', async () => {
	const { promise } = run({ operation: 'setPreferences', hedgingMode: 'noChange', leverages: 'not json' });
	await expect(promise).rejects.toThrow(/leverages must be valid json/i);
});

it('Set Preferences → rejects valid-JSON scalar (non-object leverages)', async () => {
	const { promise } = run({ operation: 'setPreferences', hedgingMode: 'noChange', leverages: '20' });
	await expect(promise).rejects.toThrow(/leverages must be a json object/i);
});

it('Set Preferences → hedging-only: PUT body has only hedgingMode', async () => {
	const { client, promise } = run({ operation: 'setPreferences', hedgingMode: 'disabled', leverages: '' });
	await promise;
	expect(client.calls[0].args).toEqual(['PUT', '/accounts/preferences', { body: { hedgingMode: false } }]);
});

it('Set Preferences → leverages-only: PUT body has only leverages', async () => {
	const { client, promise } = run({
		operation: 'setPreferences',
		hedgingMode: 'noChange',
		leverages: '{"CURRENCIES":20}',
	});
	await promise;
	expect(client.calls[0].args).toEqual([
		'PUT',
		'/accounts/preferences',
		{ body: { leverages: { CURRENCIES: 20 } } },
	]);
});

it('Demo Top-Up → POST /accounts/topUp on demo', async () => {
	const { client, promise } = run(
		{ operation: 'demoTopup', amount: 500 },
		{ credentials: { environment: 'demo' } },
	);
	await promise;
	expect(client.calls[0].args).toEqual(['POST', '/accounts/topUp', { body: { amount: 500 } }]);
});

it('Demo Top-Up → throws on live environment, sends nothing', async () => {
	const { client, promise } = run(
		{ operation: 'demoTopup', amount: 500 },
		{ credentials: { environment: 'live' } },
	);
	await expect(promise).rejects.toThrow(/demo/i);
	expect(client.calls).toHaveLength(0);
});

it('Activity History → GET /history/activity with qs incl detailed flag', async () => {
	const { client, promise } = run({
		operation: 'activityHistory',
		lastPeriod: 600,
		fromDate: '2026-01-01T00:00:00',
		toDate: '',
		detailed: true,
		dealId: 'D1',
	});
	await promise;
	expect(client.calls[0].args).toEqual([
		'GET',
		'/history/activity',
		{ qs: { lastPeriod: 600, from: '2026-01-01T00:00:00', detailed: 'true', dealId: 'D1' } },
	]);
});

it('Transaction History → GET /history/transactions with qs', async () => {
	const { client, promise } = run({
		operation: 'transactionHistory',
		lastPeriod: 100,
		transactionType: 'DEPOSIT',
		fromDate: '',
		toDate: '',
	});
	await promise;
	expect(client.calls[0].args).toEqual([
		'GET',
		'/history/transactions',
		{ qs: { lastPeriod: 100, type: 'DEPOSIT' } },
	]);
});
