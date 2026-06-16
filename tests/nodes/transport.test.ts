import type { IExecuteFunctions } from 'n8n-workflow';
import { WorkflowStaticDataStore, makeRequester } from '../../nodes/CapitalCom/transport';
import type { SessionTokens } from '../../transport';

describe('WorkflowStaticDataStore', () => {
	it('round-trips tokens through the backing object under its key', () => {
		const backing: Record<string, unknown> = {};
		const store = new WorkflowStaticDataStore(backing, 'capitalcom:demo:me');
		expect(store.get()).toBeNull();

		const tokens: SessionTokens = { cst: 'C', xSecurityToken: 'T', lastUsedAt: 1, accountId: 'A' };
		store.set(tokens);
		expect(backing['capitalcom:demo:me']).toEqual(tokens);
		expect(store.get()).toEqual(tokens);

		store.clear();
		expect(store.get()).toBeNull();
		expect(backing['capitalcom:demo:me']).toBeUndefined();
	});

	it('does not collide across different keys', () => {
		const backing: Record<string, unknown> = {};
		new WorkflowStaticDataStore(backing, 'k1').set({ cst: 'A', xSecurityToken: 'A', lastUsedAt: 1 });
		expect(new WorkflowStaticDataStore(backing, 'k2').get()).toBeNull();
	});
});

describe('makeRequester', () => {
	it('calls httpRequest with full-response + ignore-status flags and maps the result', async () => {
		const seen: Record<string, unknown>[] = [];
		const ctx = {
			helpers: {
				httpRequest: async (opts: Record<string, unknown>) => {
					seen.push(opts);
					return { statusCode: 201, headers: { CST: 'x' }, body: { ok: true } };
				},
			},
		} as unknown as IExecuteFunctions;

		const requester = makeRequester(ctx);
		const res = await requester({
			method: 'POST',
			url: 'https://demo-api-capital.backend-capital.com/api/v1/session',
			headers: { 'X-CAP-API-KEY': 'KEY' },
			body: { a: 1 },
			qs: { q: 2 },
		});

		expect(seen[0]).toMatchObject({
			method: 'POST',
			url: 'https://demo-api-capital.backend-capital.com/api/v1/session',
			json: true,
			returnFullResponse: true,
			ignoreHttpStatusErrors: true,
			qs: { q: 2 },
		});
		expect(res).toEqual({ statusCode: 201, headers: { CST: 'x' }, body: { ok: true } });
	});
});
