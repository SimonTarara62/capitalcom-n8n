import {
	CapitalComTrigger,
	PING_INTERVAL_MS,
} from '../../nodes/CapitalComTrigger/CapitalComTrigger.node';

jest.mock('../../nodes/CapitalCom/transport', () => ({
	createClient: jest.fn(async () => ({
		ensureLoggedIn: async () => ({ cst: 'CST1', xSecurityToken: 'TOK1' }),
	})),
}));

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

async function startTrigger(params: Record<string, unknown> = PRICES_PARAMS) {
	const { ctx, emitted } = makeCtx(params);
	const response = await (
		CapitalComTrigger.prototype.trigger as (this: unknown) => Promise<{
			closeFunction?: () => Promise<void>;
		}>
	).call(ctx);
	return { response, emitted, socket: FakeSocket.instances.at(-1)! };
}

beforeEach(() => {
	FakeSocket.instances = [];
	(globalThis as { WebSocket: unknown }).WebSocket = FakeSocket;
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

it('emits data messages received from the socket', async () => {
	const { socket, emitted } = await startTrigger();
	socket.fireOpen();
	socket.fireMessage(
		JSON.stringify({ destination: 'quote', status: 'OK', payload: { epic: 'GOLD', bid: 1 } }),
	);

	expect(emitted).toHaveLength(1);
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
