import { CapitalCom } from '../../nodes/CapitalCom/CapitalCom.node';
import { fakeExecute } from './helpers';

/** Scripts the login + one GET so the real CapitalClient runs end-to-end through fake HTTP. */
function httpScript() {
	return async (opts: Record<string, unknown>) => {
		const url = String(opts.url);
		if (url.endsWith('/session') && opts.method === 'POST') {
			return { statusCode: 200, headers: { CST: 'C', 'X-SECURITY-TOKEN': 'T' }, body: { currentAccountId: 'A' } };
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
	expect(node.description.displayName).toBe('Capital.com');
	expect(node.description.credentials?.[0]).toMatchObject({ name: 'capitalComApi', required: true });
	const resource = node.description.properties.find((p) => p.name === 'resource');
	expect((resource?.options ?? []).map((o) => (o as { value: string }).value).sort()).toEqual([
		'market',
		'session',
	]);
});
