import {
	CapitalComTrigger,
	PING_INTERVAL_MS,
} from '../../nodes/CapitalComTrigger/CapitalComTrigger.node';
import { createClient } from '../../nodes/CapitalCom/transport';

jest.mock('../../nodes/CapitalCom/transport', () => ({
	createClient: jest.fn(async () => ({
		ensureLoggedIn: async () => ({ cst: 'CST1', xSecurityToken: 'TOK1' }),
	})),
}));

const createClientMock = createClient as unknown as jest.Mock;

/** Minimal stand-in for the native WebSocket, driven manually by the tests. */
class FakeSocket extends EventTarget {
	static instances: FakeSocket[] = [];
	sent: string[] = [];
	closeCalls = 0;
	readonly url: string;

	constructor(url: string) {
		super();
		this.url = url;
		FakeSocket.instances.push(this);
	}

	send(data: string): void {
		this.sent.push(data);
	}

	close(): void {
		this.closeCalls += 1;
		this.dispatchEvent(new Event('close'));
	}

	fireOpen(): void {
		this.dispatchEvent(new Event('open'));
	}

	fireMessage(data: string): void {
		this.dispatchEvent(new MessageEvent('message', { data }));
	}
}

function makeCtx(params: Record<string, unknown>) {
	const emitted: unknown[][] = [];
	const ctx = {
		getNodeParameter: (name: string, fallback?: unknown) =>
			name in params ? params[name] : fallback,
		emit: (data: unknown[]) => {
			emitted.push(data);
		},
		helpers: { returnJsonArray: (x: unknown) => x },
		logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
	};
	return { ctx, emitted };
}

const PRICES_PARAMS = { stream: 'prices', epics: 'GOLD,SILVER', emitAllMessages: false };

/**
 * Every trigger started by a test, so afterEach can tear them all down. A trigger
 * left running holds a pending PING_INTERVAL_MS timer, which keeps the Jest worker
 * alive for the full 8 minutes on any filtered or --runInBand invocation.
 */
const startedTriggers: Array<{ closeFunction?: () => Promise<void> }> = [];

async function startTrigger(params: Record<string, unknown> = PRICES_PARAMS) {
	const { ctx, emitted } = makeCtx(params);
	const response = await (
		CapitalComTrigger.prototype.trigger as (this: unknown) => Promise<{
			closeFunction?: () => Promise<void>;
		}>
	).call(ctx);
	startedTriggers.push(response);
	return { response, emitted, socket: FakeSocket.instances.at(-1)! };
}

beforeEach(() => {
	FakeSocket.instances = [];
	startedTriggers.length = 0;
	(globalThis as { WebSocket: unknown }).WebSocket = FakeSocket;
});

afterEach(async () => {
	// closeFunction is idempotent, so tests that already close their trigger are fine.
	while (startedTriggers.length > 0) {
		await startedTriggers.pop()!.closeFunction?.();
	}
});

it('connects to the streaming URL without sending credentials as handshake headers', async () => {
	const { socket } = await startTrigger();
	expect(socket.url).toContain('api-streaming-capital');
	// Native WebSocket takes no second argument; a header object would mean ws is still in use.
	expect(FakeSocket.instances).toHaveLength(1);
});

it('sends a subscribe message carrying the session tokens once open', async () => {
	const { socket } = await startTrigger();
	socket.fireOpen();

	expect(socket.sent).toHaveLength(1);
	const payload = JSON.parse(socket.sent[0]);
	expect(payload.destination).toBe('marketData.subscribe');
	expect(payload.cst).toBe('CST1');
	expect(payload.securityToken).toBe('TOK1');
	expect(payload.payload.epics).toEqual(['GOLD', 'SILVER']);
});

it('emits data messages received from the socket, with the payload intact', async () => {
	const { socket, emitted } = await startTrigger();
	socket.fireOpen();
	socket.fireMessage(
		JSON.stringify({ destination: 'quote', status: 'OK', payload: { epic: 'GOLD', bid: 1 } }),
	);

	expect(emitted).toHaveLength(1);
	// Assert the message actually round-trips. Without this, an implementation
	// that emitted the wrong object (or an empty one) would still pass.
	const emittedMessage = (emitted as unknown as Array<Array<Array<Record<string, unknown>>>>)[0][0][0];
	expect(emittedMessage.destination).toBe('quote');
	expect(emittedMessage.payload).toEqual({ epic: 'GOLD', bid: 1 });
});

it('does not emit control messages when Emit All Messages is off', async () => {
	const { socket, emitted } = await startTrigger();
	socket.fireOpen();
	socket.fireMessage(JSON.stringify({ destination: 'ping', status: 'OK' }));

	expect(emitted).toHaveLength(0);
});

it('sends a ping on the ping interval', async () => {
	jest.useFakeTimers();
	try {
		const { socket } = await startTrigger();
		socket.fireOpen();
		socket.sent.length = 0;

		await jest.advanceTimersByTimeAsync(PING_INTERVAL_MS + 50);

		const pings = socket.sent.map((s) => JSON.parse(s)).filter((m) => m.destination === 'ping');
		expect(pings.length).toBeGreaterThanOrEqual(1);
		expect(pings[0].cst).toBe('CST1');
	} finally {
		jest.useRealTimers();
	}
});

it('closeFunction closes the socket and stops the ping loop', async () => {
	jest.useFakeTimers();
	try {
		const { response, socket } = await startTrigger();
		socket.fireOpen();

		await response.closeFunction!();
		expect(socket.closeCalls).toBeGreaterThanOrEqual(1);

		socket.sent.length = 0;
		await jest.advanceTimersByTimeAsync(PING_INTERVAL_MS * 3);
		expect(socket.sent).toHaveLength(0);
	} finally {
		jest.useRealTimers();
	}
});

it('reconnects after an unexpected close', async () => {
	jest.useFakeTimers();
	try {
		const { socket } = await startTrigger();
		socket.fireOpen();
		expect(FakeSocket.instances).toHaveLength(1);

		socket.close(); // the broker drops us

		// RECONNECT_BASE_MS is 2000 on the first attempt.
		await jest.advanceTimersByTimeAsync(5_000);
		expect(FakeSocket.instances.length).toBeGreaterThanOrEqual(2);
	} finally {
		jest.useRealTimers();
	}
});

it('closeFunction prevents any reconnect after an unexpected close', async () => {
	jest.useFakeTimers();
	try {
		const { response, socket } = await startTrigger();
		socket.fireOpen();
		await response.closeFunction!();

		const countAfterClose = FakeSocket.instances.length;
		socket.close();
		await jest.advanceTimersByTimeAsync(120_000);

		expect(FakeSocket.instances).toHaveLength(countAfterClose);
	} finally {
		jest.useRealTimers();
	}
});

it('does not leave a live socket when the trigger is torn down mid-login', async () => {
	jest.useFakeTimers();
	try {
		const { response, socket } = await startTrigger();
		socket.fireOpen();

		// Park the reconnect's login so teardown lands while it is still in flight.
		let releaseLogin!: (client: { ensureLoggedIn: () => Promise<unknown> }) => void;
		createClientMock.mockImplementationOnce(
			async () =>
				await new Promise((resolve) => {
					releaseLogin = resolve;
				}),
		);

		socket.close(); // the broker drops us -> backoff -> connect()
		await jest.advanceTimersByTimeAsync(5_000);

		// connect() is now parked inside createClient, before any socket exists.
		expect(createClientMock).toHaveBeenCalledTimes(2);
		const countAtTeardown = FakeSocket.instances.length;

		await response.closeFunction!();

		// The login finally lands, long after the workflow was torn down.
		releaseLogin({ ensureLoggedIn: async () => ({ cst: 'CST1', xSecurityToken: 'TOK1' }) });
		await jest.advanceTimersByTimeAsync(100);

		// Either no socket was opened at all, or anything opened was closed at once.
		const openedAfterTeardown = FakeSocket.instances.slice(countAtTeardown);
		for (const leaked of openedAfterTeardown) {
			expect(leaked.closeCalls).toBeGreaterThanOrEqual(1);
			leaked.fireOpen();
		}

		// ...and nothing keeps pinging the broker afterwards.
		await jest.advanceTimersByTimeAsync(PING_INTERVAL_MS * 2);
		for (const leaked of openedAfterTeardown) {
			expect(leaked.sent).toHaveLength(0);
		}
	} finally {
		jest.useRealTimers();
	}
});
