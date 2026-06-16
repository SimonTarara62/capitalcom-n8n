import {
	executeConfirmation,
	waitForConfirmation,
} from '../../nodes/CapitalCom/actions/confirmation';
import { fakeExecute } from './helpers';
import type { CapitalClientLike } from '../../nodes/CapitalCom/actions/session';

/** Client that returns queued responses for the same path, in order. */
class QueuedClient {
	public calls: string[] = [];
	constructor(private readonly queue: unknown[]) {}
	async request(_method: string, path: string): Promise<unknown> {
		this.calls.push(path);
		return this.queue.shift() ?? {};
	}
	async switchAccount(): Promise<unknown> {
		return {};
	}
}

const noSleep = async () => {};

it('waitForConfirmation polls until ACCEPTED and normalizes status', async () => {
	const client = new QueuedClient([
		{ dealStatus: 'PENDING' },
		{ dealStatus: 'ACCEPTED', dealId: 'D1' },
	]);
	const out = await waitForConfirmation(client as unknown as CapitalClientLike, 'REF1', {
		intervalMs: 1,
		timeoutMs: 10_000,
		sleep: noSleep,
		now: () => 0,
	});
	expect(out).toEqual({ dealStatus: 'ACCEPTED', dealId: 'D1', status: 'ACCEPTED' });
	expect(client.calls).toEqual(['/confirms/REF1', '/confirms/REF1']);
});

it('waitForConfirmation returns TIMEOUT when the deadline passes', async () => {
	const client = new QueuedClient([{ dealStatus: 'PENDING' }]);
	const out = (await waitForConfirmation(client as unknown as CapitalClientLike, 'REF1', {
		timeoutMs: 0,
		sleep: noSleep,
		now: () => 0,
	})) as { status: string };
	expect(out.status).toBe('TIMEOUT');
});

it('Confirmation: Get → GET /confirms/{ref}', async () => {
	const client = new QueuedClient([{ dealStatus: 'ACCEPTED' }]);
	const ctx = fakeExecute({ params: { operation: 'get', dealReference: 'REF9' } });
	await executeConfirmation(client as unknown as CapitalClientLike, ctx, 0);
	expect(client.calls[0]).toBe('/confirms/REF9');
});

it('Confirmation: Wait For → polls and returns normalized status', async () => {
	const client = new QueuedClient([{ dealStatus: 'REJECTED' }]);
	const ctx = fakeExecute({ params: { operation: 'waitFor', dealReference: 'REF9', timeout: 5 } });
	const out = (await executeConfirmation(client as unknown as CapitalClientLike, ctx, 0)) as {
		status: string;
	};
	expect(out.status).toBe('REJECTED');
});
