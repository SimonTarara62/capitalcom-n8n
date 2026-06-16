import type {
	HttpRequestSpec,
	HttpResponse,
	SessionStore,
	SessionTokens,
} from '../../transport/types';

export class MemoryStore implements SessionStore {
	private tokens: SessionTokens | null = null;
	get(): SessionTokens | null {
		return this.tokens;
	}
	set(tokens: SessionTokens): void {
		this.tokens = tokens;
	}
	clear(): void {
		this.tokens = null;
	}
}

/** Records calls and returns queued responses in order. */
export class FakeRequester {
	public calls: HttpRequestSpec[] = [];
	private queue: HttpResponse[] = [];

	enqueue(...responses: HttpResponse[]): this {
		this.queue.push(...responses);
		return this;
	}

	readonly fn = async (spec: HttpRequestSpec): Promise<HttpResponse> => {
		this.calls.push(spec);
		const next = this.queue.shift();
		if (!next) throw new Error('FakeRequester: no response queued');
		return next;
	};
}

export function loginResponse(cst = 'CST1', token = 'TOK1', accountId = 'ACC1'): HttpResponse {
	return {
		statusCode: 200,
		headers: { CST: cst, 'X-SECURITY-TOKEN': token },
		body: { currentAccountId: accountId },
	};
}
