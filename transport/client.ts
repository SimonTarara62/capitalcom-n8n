import { apiBaseUrl } from './urls';
import { CapitalApiError, CapitalAuthError, extractErrorMessage } from './errors';
import { RateLimiter, type RateLimitKind } from './rateLimit';
import type {
	CapitalCredentials,
	Clock,
	HttpMethod,
	HttpResponse,
	Requester,
	SessionStore,
	SessionTokens,
} from './types';

const SESSION_MAX_AGE_MS = 540_000; // 9 minutes, matching the CLI
const USER_AGENT = 'n8n-nodes-capitalcom (+https://github.com/SimonTarara62/n8n-nodes-capitalcom)';

export interface CapitalClientOptions {
	credentials: CapitalCredentials;
	requester: Requester;
	store: SessionStore;
	rateLimiter?: RateLimiter;
	now?: Clock;
}

export interface RequestOptions {
	body?: unknown;
	qs?: Record<string, unknown>;
	retryOnAuth?: boolean;
}

/** Case-insensitive header read (n8n/undici lower-case header names). */
function header(headers: Record<string, string>, name: string): string | undefined {
	const target = name.toLowerCase();
	for (const [k, v] of Object.entries(headers)) {
		if (k.toLowerCase() === target) return v;
	}
	return undefined;
}

/** Exported for unit-testing; determines which rate-limit bucket to use. */
export function rateLimitKind(method: HttpMethod, path: string): RateLimitKind {
	const isWrite = method === 'POST' || method === 'PUT' || method === 'DELETE';
	if (isWrite && path.startsWith('/session')) return 'session';
	if (isWrite && (path.startsWith('/positions') || path.startsWith('/workingorders'))) return 'trading';
	return 'global';
}

export class CapitalClient {
	private readonly creds: CapitalCredentials;
	private readonly requester: Requester;
	private readonly store: SessionStore;
	private readonly rateLimiter: RateLimiter;
	private readonly now: Clock;

	constructor(opts: CapitalClientOptions) {
		this.creds = opts.credentials;
		this.requester = opts.requester;
		this.store = opts.store;
		this.rateLimiter = opts.rateLimiter ?? new RateLimiter();
		this.now = opts.now ?? (() => Date.now());
	}

	private url(path: string): string {
		return `${apiBaseUrl(this.creds.environment)}${path}`;
	}

	private baseHeaders(): Record<string, string> {
		return {
			'Content-Type': 'application/json',
			Accept: 'application/json',
			'User-Agent': USER_AGENT,
			'X-CAP-API-KEY': this.creds.apiKey,
		};
	}

	async login(): Promise<SessionTokens> {
		const ok = await this.rateLimiter.acquire('session');
		if (!ok) throw new CapitalApiError('Rate limit timeout on login', 429);

		const res = await this.requester({
			method: 'POST',
			url: this.url('/session'),
			headers: this.baseHeaders(),
			body: {
				identifier: this.creds.identifier,
				password: this.creds.password,
				encryptedPassword: false,
			},
		});

		if (res.statusCode >= 400) {
			throw new CapitalAuthError(`Login failed: ${extractErrorMessage(res.statusCode, res.body)}`, res.statusCode, res.body);
		}

		const cst = header(res.headers, 'CST');
		const xSecurityToken = header(res.headers, 'X-SECURITY-TOKEN');
		if (!cst || !xSecurityToken) {
			throw new CapitalAuthError('Login response missing required tokens', res.statusCode, res.body);
		}

		const accountId =
			res.body && typeof res.body === 'object'
				? (res.body as Record<string, unknown>).currentAccountId
				: undefined;

		const tokens: SessionTokens = {
			cst,
			xSecurityToken,
			lastUsedAt: this.now(),
			accountId: typeof accountId === 'string' ? accountId : undefined,
		};
		this.store.set(tokens);
		return tokens;
	}

	private isExpired(tokens: SessionTokens): boolean {
		return this.now() - tokens.lastUsedAt >= SESSION_MAX_AGE_MS;
	}

	async ensureLoggedIn(): Promise<SessionTokens> {
		const cached = this.store.get();
		if (cached && !this.isExpired(cached)) return cached;
		return this.login();
	}

	private authHeaders(tokens: SessionTokens): Record<string, string> {
		return {
			...this.baseHeaders(),
			CST: tokens.cst,
			'X-SECURITY-TOKEN': tokens.xSecurityToken,
		};
	}

	async request(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<unknown> {
		const retryOnAuth = options.retryOnAuth ?? true;
		let tokens = await this.ensureLoggedIn();
		let authRetried = false;

		const ok = await this.rateLimiter.acquire(rateLimitKind(method, path));
		if (!ok) throw new CapitalApiError('Rate limit timeout', 429);

		for (;;) {
			const res: HttpResponse = await this.requester({
				method,
				url: this.url(path),
				headers: this.authHeaders(tokens),
				body: options.body,
				qs: options.qs,
			});

			if (res.statusCode === 401 || res.statusCode === 403) {
				if (retryOnAuth && !authRetried && method === 'GET') {
					authRetried = true;
					tokens = await this.login();
					continue;
				}
				throw new CapitalAuthError(
					`Authentication failed: ${extractErrorMessage(res.statusCode, res.body)}`,
					res.statusCode,
					res.body,
				);
			}

			if (res.statusCode >= 400) {
				throw new CapitalApiError(extractErrorMessage(res.statusCode, res.body), res.statusCode, undefined, res.body);
			}

			// Refresh last-used so the cached session stays warm.
			this.store.set({ ...tokens, lastUsedAt: this.now() });
			return res.body;
		}
	}

	async switchAccount(accountId: string): Promise<unknown> {
		const body = await this.request('PUT', '/session', { body: { accountId } });
		const cached = this.store.get();
		if (cached) this.store.set({ ...cached, accountId, lastUsedAt: this.now() });
		return body;
	}
}
