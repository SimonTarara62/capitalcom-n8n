import { CapitalClient } from '../../transport/client';
import { FakeRequester, MemoryStore } from './helpers';
import type { CapitalCredentials } from '../../transport/types';

const creds: CapitalCredentials = {
	apiKey: 'KEY',
	identifier: 'me@example.com',
	password: 'pw',
	environment: 'demo',
};

it('switchAccount PUTs /session and updates the cached accountId', async () => {
	const store = new MemoryStore();
	store.set({ cst: 'C', xSecurityToken: 'T', lastUsedAt: 1000, accountId: 'OLD' });
	const req = new FakeRequester().enqueue({ statusCode: 200, headers: {}, body: { trailingAccountId: 'NEW' } });
	const client = new CapitalClient({ credentials: creds, requester: req.fn, store, now: () => 1000 });

	await client.switchAccount('NEW');

	expect(req.calls[0].method).toBe('PUT');
	expect(req.calls[0].url).toContain('/session');
	expect(req.calls[0].body).toEqual({ accountId: 'NEW' });
	expect(store.get()!.accountId).toBe('NEW');
});
