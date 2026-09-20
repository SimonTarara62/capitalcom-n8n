import { executeSession } from '../../nodes/CapitalCom/actions/session';
import { FakeClient, fakeExecute } from './helpers';
import type { CapitalClientLike } from '../../nodes/CapitalCom/actions/session';

function run(operation: string, params: Record<string, unknown> = {}) {
	const client = new FakeClient({
		'GET /time': { serverTime: 1 },
		'GET /ping': { status: 'OK' },
		'GET /session': { clientId: 'c' },
	});
	const ctx = fakeExecute({ params: { operation, ...params } });
	return { client, promise: executeSession(client as unknown as CapitalClientLike, ctx, 0) };
}

it('Get Server Time → GET /time', async () => {
	const { client, promise } = run('getServerTime');
	await expect(promise).resolves.toEqual({ serverTime: 1 });
	expect(client.calls[0]).toEqual({ kind: 'request', args: ['GET', '/time', undefined] });
});

it('Ping → GET /ping', async () => {
	const { client, promise } = run('ping');
	await promise;
	expect(client.calls[0].args.slice(0, 2)).toEqual(['GET', '/ping']);
});

it('Get Details → GET /session', async () => {
	const { client, promise } = run('getDetails');
	await promise;
	expect(client.calls[0].args.slice(0, 2)).toEqual(['GET', '/session']);
});

it('Switch Account → client.switchAccount(accountId)', async () => {
	const { client, promise } = run('switchAccount', { accountId: 'ACC7' });
	await promise;
	expect(client.calls[0]).toEqual({ kind: 'switchAccount', args: ['ACC7'] });
});

// Guards the resource-locator conversion: accountId is now read with `extractValue: true`
// (see nodes/CapitalCom/actions/session.ts). A resource-locator-shaped value must resolve to
// the same string as the plain-string value it replaces — if `extractValue` were dropped,
// switchAccount would receive the whole `{ mode, value }` object instead of the account ID.
it('Switch Account with a resource-locator-shaped accountId reaches the client with the same value as a plain string (extractValue guard)', async () => {
	const plain = run('switchAccount', { accountId: 'ACC7' });
	await plain.promise;

	const locator = run('switchAccount', { accountId: { mode: 'list', value: 'ACC7' } });
	await locator.promise;

	expect(locator.client.calls[0]).toEqual({ kind: 'switchAccount', args: ['ACC7'] });
	expect(locator.client.calls[0]).toEqual(plain.client.calls[0]);
});

it('throws on an unknown operation', async () => {
	const { promise } = run('bogus');
	await expect(promise).rejects.toThrow(/unsupported session operation/i);
});
