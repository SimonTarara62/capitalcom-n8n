import { CapitalClient } from '../../transport/client';
import { FakeRequester, MemoryStore, loginResponse } from './helpers';
import type { CapitalCredentials } from '../../transport/types';

const creds: CapitalCredentials = {
	apiKey: 'KEY',
	identifier: 'me@example.com',
	password: 'pw',
	environment: 'demo',
};

it('logs in via POST /session and stores tokens from response headers', async () => {
	const req = new FakeRequester().enqueue(loginResponse('C', 'T', 'ACC9'));
	const store = new MemoryStore();
	const client = new CapitalClient({ credentials: creds, requester: req.fn, store, now: () => 1000 });

	await client.login();

	const call = req.calls[0];
	expect(call.method).toBe('POST');
	expect(call.url).toBe('https://demo-api-capital.backend-capital.com/api/v1/session');
	expect(call.headers['X-CAP-API-KEY']).toBe('KEY');
	expect(call.body).toEqual({ identifier: 'me@example.com', password: 'pw', encryptedPassword: false });

	const tokens = store.get();
	expect(tokens).toEqual({ cst: 'C', xSecurityToken: 'T', lastUsedAt: 1000, accountId: 'ACC9' });
});

it('throws when the login response is missing tokens', async () => {
	const req = new FakeRequester().enqueue({ statusCode: 200, headers: {}, body: {} });
	const client = new CapitalClient({ credentials: creds, requester: req.fn, store: new MemoryStore() });
	await expect(client.login()).rejects.toThrow(/missing required tokens/i);
});
