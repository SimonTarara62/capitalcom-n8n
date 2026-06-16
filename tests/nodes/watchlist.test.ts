import { executeWatchlist } from '../../nodes/CapitalCom/actions/watchlist';
import { FakeClient, fakeExecute } from './helpers';
import type { CapitalClientLike } from '../../nodes/CapitalCom/actions/session';

function run(params: Record<string, unknown>, responses: Record<string, unknown> = {}) {
	const client = new FakeClient(responses);
	const ctx = fakeExecute({ params });
	return { client, promise: executeWatchlist(client as unknown as CapitalClientLike, ctx, 0) };
}

it('List → GET /watchlists', async () => {
	const { client, promise } = run({ operation: 'list' });
	await promise;
	expect(client.calls[0].args.slice(0, 2)).toEqual(['GET', '/watchlists']);
});

it('Get → GET /watchlists/{id}', async () => {
	const { client, promise } = run({ operation: 'get', watchlistId: 'w1' });
	await promise;
	expect(client.calls[0].args.slice(0, 2)).toEqual(['GET', '/watchlists/w1']);
});

it('Create → POST /watchlists with name', async () => {
	const { client, promise } = run({ operation: 'create', name: 'My List' });
	await promise;
	expect(client.calls[0].args).toEqual(['POST', '/watchlists', { body: { name: 'My List' } }]);
});

it('Add Market → PUT /watchlists/{id} with epic', async () => {
	const { client, promise } = run({ operation: 'addMarket', watchlistId: 'w1', epic: 'GOLD' });
	await promise;
	expect(client.calls[0].args).toEqual(['PUT', '/watchlists/w1', { body: { epic: 'GOLD' } }]);
});

it('Remove Market → DELETE /watchlists/{id}/{epic}, empty body → status removed', async () => {
	const { client, promise } = run(
		{ operation: 'removeMarket', watchlistId: 'w1', epic: 'GOLD' },
		{ 'DELETE /watchlists/w1/GOLD': '' },
	);
	const out = await promise;
	expect(client.calls[0].args.slice(0, 2)).toEqual(['DELETE', '/watchlists/w1/GOLD']);
	expect(out).toEqual({ status: 'removed' });
});

it('Delete → DELETE /watchlists/{id}, empty body → status deleted', async () => {
	const { client, promise } = run(
		{ operation: 'delete', watchlistId: 'w1' },
		{ 'DELETE /watchlists/w1': '' },
	);
	const out = await promise;
	expect(client.calls[0].args.slice(0, 2)).toEqual(['DELETE', '/watchlists/w1']);
	expect(out).toEqual({ status: 'deleted' });
});

it('Remove Market → DELETE with real body passes through (no fallback)', async () => {
	const { client, promise } = run(
		{ operation: 'removeMarket', watchlistId: 'w1', epic: 'GOLD' },
		{ 'DELETE /watchlists/w1/GOLD': { dealReference: 'X' } },
	);
	const out = await promise;
	expect(client.calls[0].args.slice(0, 2)).toEqual(['DELETE', '/watchlists/w1/GOLD']);
	expect(out).toEqual({ dealReference: 'X' });
});
