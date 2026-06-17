import { CapitalCom } from '../../nodes/CapitalCom/CapitalCom.node';
import { fakeExecute } from './helpers';

/** Scripts the login + one GET so the real CapitalClient runs end-to-end through fake HTTP. */
function httpScript() {
	return async (opts: Record<string, unknown>) => {
		const url = String(opts.url);
		if (url.endsWith('/session') && opts.method === 'POST') {
			return { statusCode: 200, headers: { CST: 'C', 'X-SECURITY-TOKEN': 'T' }, body: { currentAccountId: 'A' } };
		}
		if (url.endsWith('/session') && opts.method === 'PUT') {
			return { statusCode: 200, headers: {}, body: { trailingAccountId: 'NEW' } };
		}
		if (url.endsWith('/ping')) {
			return { statusCode: 200, headers: {}, body: { status: 'OK' } };
		}
		return { statusCode: 404, headers: {}, body: { errorCode: 'not.found' } };
	};
}

const creds = { apiKey: 'K', identifier: 'me@example.com', password: 'p', environment: 'demo' };

it('routes a Session: Ping through the real client and returns the body', async () => {
	const node = new CapitalCom();
	const ctx = fakeExecute({
		params: { resource: 'session', operation: 'ping' },
		credentials: creds,
		httpRequest: httpScript(),
	});
	const out = await node.execute.call(ctx);
	expect(out).toEqual([[{ json: { status: 'OK' }, pairedItem: { item: 0 } }]]);
});

it('continueOnFail surfaces the error as data instead of throwing', async () => {
	const node = new CapitalCom();
	const ctx = fakeExecute({
		params: { resource: 'session', operation: 'getServerTime' }, // /time → 404 in the script
		credentials: creds,
		continueOnFail: true,
		httpRequest: httpScript(),
	});
	const out = (await node.execute.call(ctx)) as Array<Array<{ json: { error?: string } }>>;
	expect(out[0][0].json.error).toBeDefined();
});

it('exposes the expected node description', () => {
	const node = new CapitalCom();
	expect(node.description.name).toBe('capitalCom');
	expect(node.description.displayName).toBe('Capital.com (Unofficial)');
	expect(node.description.credentials?.[0]).toMatchObject({ name: 'capitalComApi', required: true });
	const resource = node.description.properties.find((p) => p.name === 'resource');
	expect((resource?.options ?? []).map((o) => (o as { value: string }).value).sort()).toEqual([
		'account',
		'confirmation',
		'market',
		'order',
		'position',
		'session',
		'watchlist',
	]);
});

it('multi-item execution: 2 inputs produce 2 paired output rows', async () => {
	const node = new CapitalCom();
	const ctx = fakeExecute({
		params: { resource: 'session', operation: 'ping' },
		credentials: creds,
		itemCount: 2,
		httpRequest: httpScript(),
	});
	const out = await node.execute.call(ctx);
	// Returns [[row0, row1]] — one output array with two rows.
	expect(out[0]).toHaveLength(2);
	expect(out[0][0].pairedItem).toEqual({ item: 0 });
	expect(out[0][1].pairedItem).toEqual({ item: 1 });
});

it('switchAccount routes through the router and returns the PUT /session body', async () => {
	const node = new CapitalCom();
	const ctx = fakeExecute({
		params: { resource: 'session', operation: 'switchAccount', accountId: 'NEW' },
		credentials: creds,
		httpRequest: httpScript(),
	});
	const out = await node.execute.call(ctx);
	// The body returned by PUT /session is { trailingAccountId: 'NEW' }.
	expect(out[0][0].json).toMatchObject({ trailingAccountId: 'NEW' });
});

it('routes an Account: List through the node', async () => {
	const node = new CapitalCom();
	const http = async (opts: Record<string, unknown>) => {
		const url = String(opts.url);
		if (url.endsWith('/session') && opts.method === 'POST') {
			return { statusCode: 200, headers: { CST: 'C', 'X-SECURITY-TOKEN': 'T' }, body: {} };
		}
		if (url.endsWith('/accounts')) {
			return { statusCode: 200, headers: {}, body: { accounts: [{ accountId: 'A' }] } };
		}
		return { statusCode: 404, headers: {}, body: { errorCode: 'not.found' } };
	};
	const ctx = fakeExecute({
		params: { resource: 'account', operation: 'list' },
		credentials: { apiKey: 'K', identifier: 'me@example.com', password: 'p', environment: 'demo' },
		httpRequest: http,
	});
	const out = await node.execute.call(ctx);
	expect(out).toEqual([[{ json: { accounts: [{ accountId: 'A' }] }, pairedItem: { item: 0 } }]]);
});

it('routes a Watchlist: Create through the node', async () => {
	const node = new CapitalCom();
	const http = async (opts: Record<string, unknown>) => {
		const url = String(opts.url);
		if (url.endsWith('/session') && opts.method === 'POST') {
			return { statusCode: 200, headers: { CST: 'C', 'X-SECURITY-TOKEN': 'T' }, body: {} };
		}
		if (url.endsWith('/watchlists') && opts.method === 'POST') {
			return { statusCode: 200, headers: {}, body: { watchlistId: 'w9', status: 'SUCCESS' } };
		}
		return { statusCode: 404, headers: {}, body: { errorCode: 'not.found' } };
	};
	const ctx = fakeExecute({
		params: { resource: 'watchlist', operation: 'create', name: 'My List' },
		credentials: { apiKey: 'K', identifier: 'me@example.com', password: 'p', environment: 'demo' },
		httpRequest: http,
	});
	const out = await node.execute.call(ctx);
	expect(out).toEqual([
		[{ json: { watchlistId: 'w9', status: 'SUCCESS' }, pairedItem: { item: 0 } }],
	]);
});

it('routes a Position: Open through the node and returns the deal reference', async () => {
	const node = new CapitalCom();
	const http = async (opts: Record<string, unknown>) => {
		const url = String(opts.url);
		if (url.endsWith('/session') && opts.method === 'POST') {
			return { statusCode: 200, headers: { CST: 'C', 'X-SECURITY-TOKEN': 'T' }, body: {} };
		}
		if (url.endsWith('/positions') && opts.method === 'POST') {
			return { statusCode: 200, headers: {}, body: { dealReference: 'R1' } };
		}
		return { statusCode: 404, headers: {}, body: { errorCode: 'not.found' } };
	};
	const ctx = fakeExecute({
		params: {
			resource: 'position',
			operation: 'open',
			epic: 'GOLD',
			direction: 'BUY',
			size: 1,
			stopsLimits: {},
			dryRun: false,
			waitForConfirmation: false,
		},
		credentials: { apiKey: 'K', identifier: 'me@example.com', password: 'p', environment: 'demo' },
		httpRequest: http,
	});
	const out = await node.execute.call(ctx);
	expect(out).toEqual([[{ json: { dealReference: 'R1' }, pairedItem: { item: 0 } }]]);
});

it('routes a Position: Open Dry Run without any POST', async () => {
	const node = new CapitalCom();
	const calls: string[] = [];
	const http = async (opts: Record<string, unknown>) => {
		calls.push(`${opts.method} ${String(opts.url)}`);
		if (String(opts.url).endsWith('/session') && opts.method === 'POST') {
			return { statusCode: 200, headers: { CST: 'C', 'X-SECURITY-TOKEN': 'T' }, body: {} };
		}
		return { statusCode: 200, headers: {}, body: {} };
	};
	const ctx = fakeExecute({
		params: {
			resource: 'position',
			operation: 'open',
			epic: 'GOLD',
			direction: 'BUY',
			size: 1,
			stopsLimits: {},
			dryRun: true,
		},
		credentials: { apiKey: 'K', identifier: 'me@example.com', password: 'p', environment: 'demo' },
		httpRequest: http,
	});
	const out = (await node.execute.call(ctx)) as Array<Array<{ json: { dryRun?: boolean } }>>;
	expect(out[0][0].json.dryRun).toBe(true);
	expect(calls.some((c) => c.includes('/positions'))).toBe(false); // never POSTed
});

it('shows an unofficial notice and a docs link', () => {
	const node = new CapitalCom();
	const notice = node.description.properties.find((p) => p.type === 'notice');
	expect(notice).toBeDefined();
	expect(notice!.displayName.toLowerCase()).toContain('unofficial');
	expect(notice!.displayName.toLowerCase()).toContain('not affiliated');
	expect(node.description.documentationUrl).toContain('github.com/SimonTarara62/capitalcom-n8n');
	expect(node.description.defaults.name).toBe('Capital.com (Unofficial)');
});
