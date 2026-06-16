import { CapitalApiError, CapitalAuthError } from '../../transport/errors';
import { CapitalClient } from '../../transport/client';
import { FakeRequester, MemoryStore, loginResponse } from './helpers';
import type { CapitalCredentials } from '../../transport/types';

const creds: CapitalCredentials = {
	apiKey: 'KEY',
	identifier: 'me@example.com',
	password: 'pw',
	environment: 'demo',
};

function freshClient(req: FakeRequester) {
	const store = new MemoryStore();
	store.set({ cst: 'C', xSecurityToken: 'T', lastUsedAt: 1000 });
	return new CapitalClient({ credentials: creds, requester: req.fn, store, now: () => 1000 });
}

it('re-logs-in once and retries a GET that returns 401', async () => {
	const req = new FakeRequester().enqueue(
		{ statusCode: 401, headers: {}, body: { errorCode: 'error.invalid.session.token' } },
		loginResponse('C2', 'T2'),
		{ statusCode: 200, headers: {}, body: { ok: true } },
	);
	const client = freshClient(req);

	const body = await client.request('GET', '/accounts');

	expect(body).toEqual({ ok: true });
	expect(req.calls[1].url).toContain('/session'); // the re-login
	expect(req.calls[2].headers.CST).toBe('C2'); // retried with new token
});

it('does NOT retry a 401 on a non-GET; throws CapitalAuthError', async () => {
	const req = new FakeRequester().enqueue({
		statusCode: 401,
		headers: {},
		body: { errorCode: 'error.invalid.session.token' },
	});
	const client = freshClient(req);

	await expect(client.request('POST', '/positions', { body: {} })).rejects.toBeInstanceOf(CapitalAuthError);
	expect(req.calls).toHaveLength(1); // no re-login attempt
});

it('maps a 400 errorCode body to CapitalApiError', async () => {
	// Each assertion issues its own request, so build a fresh client per call
	// (the FakeRequester queue is single-use).
	const make = () =>
		freshClient(
			new FakeRequester().enqueue({
				statusCode: 400,
				headers: {},
				body: { errorCode: 'error.invalid.epic' },
			}),
		);

	await expect(make().request('GET', '/markets/BAD')).rejects.toMatchObject({
		message: 'error.invalid.epic',
		statusCode: 400,
	});
	await expect(make().request('GET', '/markets/BAD')).rejects.toBeInstanceOf(CapitalApiError);
});
