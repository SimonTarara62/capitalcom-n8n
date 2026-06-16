import { executePosition } from '../../nodes/CapitalCom/actions/position';
import { FakeClient, fakeExecute } from './helpers';
import type { CapitalClientLike } from '../../nodes/CapitalCom/actions/session';

function run(params: Record<string, unknown>, responses: Record<string, unknown> = {}) {
	const client = new FakeClient(responses);
	const ctx = fakeExecute({ params });
	return { client, promise: executePosition(client as unknown as CapitalClientLike, ctx, 0) };
}

it('List → GET /positions, truncates to limit', async () => {
	const { client, promise } = run(
		{ operation: 'list', limit: 1 },
		{ 'GET /positions': { positions: [{ a: 1 }, { a: 2 }] } },
	);
	const out = (await promise) as { positions: unknown[] };
	expect(client.calls[0].args.slice(0, 2)).toEqual(['GET', '/positions']);
	expect(out.positions).toHaveLength(1);
});

it('Get → GET /positions/{dealId}', async () => {
	const { client, promise } = run({ operation: 'get', dealId: 'D1' });
	await promise;
	expect(client.calls[0].args.slice(0, 2)).toEqual(['GET', '/positions/D1']);
});

it('Preview → returns the request body, sends nothing', async () => {
	const { client, promise } = run({
		operation: 'preview',
		epic: 'GOLD',
		direction: 'BUY',
		size: 1,
		stopsLimits: {},
	});
	const out = (await promise) as { preview: boolean; request: Record<string, unknown> };
	expect(out.preview).toBe(true);
	expect(out.request).toEqual({ epic: 'GOLD', direction: 'BUY', size: 1 });
	expect(client.calls).toHaveLength(0);
});

it('Open → POST /positions with built body', async () => {
	const { client, promise } = run(
		{ operation: 'open', epic: 'GOLD', direction: 'BUY', size: 1, stopsLimits: {}, dryRun: false, waitForConfirmation: false },
		{ 'POST /positions': { dealReference: 'R1' } },
	);
	const out = (await promise) as { dealReference: string };
	expect(client.calls[0].args).toEqual(['POST', '/positions', { body: { epic: 'GOLD', direction: 'BUY', size: 1 } }]);
	expect(out.dealReference).toBe('R1');
});

it('Open with Dry Run → returns request, sends nothing', async () => {
	const { client, promise } = run({
		operation: 'open', epic: 'GOLD', direction: 'BUY', size: 1, stopsLimits: {}, dryRun: true,
	});
	const out = (await promise) as { dryRun: boolean };
	expect(out.dryRun).toBe(true);
	expect(client.calls).toHaveLength(0);
});

it('Open → max-size guard blocks before sending', async () => {
	const { client, promise } = run({
		operation: 'open', epic: 'GOLD', direction: 'BUY', size: 10, stopsLimits: {}, dryRun: false, maxSize: 5,
	});
	await expect(promise).rejects.toThrow(/exceeds the max size guard/i);
	expect(client.calls).toHaveLength(0);
});

it('Amend → PUT /positions/{dealId} with stops/limits only', async () => {
	const { client, promise } = run({
		operation: 'amend', dealId: 'D1', stopsLimits: { stopLevel: 1850 },
	});
	await promise;
	expect(client.calls[0].args).toEqual(['PUT', '/positions/D1', { body: { stopLevel: 1850 } }]);
});

it('Close → DELETE /positions/{dealId}', async () => {
	const { client, promise } = run({ operation: 'close', dealId: 'D1' });
	await promise;
	expect(client.calls[0].args.slice(0, 2)).toEqual(['DELETE', '/positions/D1']);
});
