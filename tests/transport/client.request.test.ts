import { CapitalClient } from '../../transport/client';
import { FakeRequester, MemoryStore, loginResponse } from './helpers';
import type { CapitalCredentials } from '../../transport/types';

const creds: CapitalCredentials = {
	apiKey: 'KEY',
	identifier: 'me@example.com',
	password: 'pw',
	environment: 'demo',
};

it('auto-logs-in then sends auth headers on a GET', async () => {
	const req = new FakeRequester().enqueue(
		loginResponse('C', 'T'),
		{ statusCode: 200, headers: {}, body: { markets: [] } },
	);
	const client = new CapitalClient({ credentials: creds, requester: req.fn, store: new MemoryStore(), now: () => 5000 });

	const body = await client.request('GET', '/markets', { qs: { searchTerm: 'gold' } });

	expect(body).toEqual({ markets: [] });
	const getCall = req.calls[1];
	expect(getCall.method).toBe('GET');
	expect(getCall.url).toBe('https://demo-api-capital.backend-capital.com/api/v1/markets');
	expect(getCall.qs).toEqual({ searchTerm: 'gold' });
	expect(getCall.headers.CST).toBe('C');
	expect(getCall.headers['X-SECURITY-TOKEN']).toBe('T');
	expect(getCall.headers['X-CAP-API-KEY']).toBe('KEY');
});

it('reuses a cached session and refreshes lastUsedAt', async () => {
	const store = new MemoryStore();
	store.set({ cst: 'C', xSecurityToken: 'T', lastUsedAt: 0 });
	let t = 1000;
	const req = new FakeRequester().enqueue({ statusCode: 200, headers: {}, body: { ok: true } });
	const client = new CapitalClient({ credentials: creds, requester: req.fn, store, now: () => t });

	await client.request('GET', '/accounts');

	expect(req.calls).toHaveLength(1); // no login call — cache reused
	expect(store.get()!.lastUsedAt).toBe(1000);
});

it('re-logs-in when the cached session is older than 540s', async () => {
	const store = new MemoryStore();
	store.set({ cst: 'OLD', xSecurityToken: 'OLD', lastUsedAt: 0 });
	const req = new FakeRequester().enqueue(
		loginResponse('NEW', 'NEW'),
		{ statusCode: 200, headers: {}, body: { ok: true } },
	);
	const client = new CapitalClient({ credentials: creds, requester: req.fn, store, now: () => 540_001 });

	await client.request('GET', '/accounts');

	expect(req.calls[0].url).toContain('/session'); // forced re-login
	expect(store.get()!.cst).toBe('NEW');
});
