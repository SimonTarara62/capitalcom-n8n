export type CapitalEnvironment = 'demo' | 'live';

export interface CapitalCredentials {
	apiKey: string;
	identifier: string;
	password: string;
	environment: CapitalEnvironment;
}

export interface SessionTokens {
	cst: string;
	xSecurityToken: string;
	/** Epoch milliseconds of last use; drives expiry. */
	lastUsedAt: number;
	accountId?: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface HttpRequestSpec {
	method: HttpMethod;
	url: string;
	headers: Record<string, string>;
	body?: unknown;
	qs?: Record<string, unknown>;
}

export interface HttpResponse {
	statusCode: number;
	headers: Record<string, string>;
	body: unknown;
}

/** Performs one HTTP round-trip. Node wraps n8n's httpRequest; tests inject a fake. */
export type Requester = (spec: HttpRequestSpec) => Promise<HttpResponse>;

/** Token persistence. Node backs this with workflowStaticData; tests use in-memory. */
export interface SessionStore {
	get(): SessionTokens | null;
	set(tokens: SessionTokens): void;
	clear(): void;
}

/** Returns epoch milliseconds. Injectable so expiry is deterministic in tests. */
export type Clock = () => number;
