import type { Clock } from './types';

export class TokenBucket {
	private tokens: number;
	private lastRefill: number;

	constructor(
		private readonly capacity: number,
		private readonly refillPerSecond: number,
		private readonly now: Clock = () => Date.now(),
	) {
		this.tokens = capacity;
		this.lastRefill = now();
	}

	private refill(): void {
		const nowMs = this.now();
		const elapsedSec = (nowMs - this.lastRefill) / 1000;
		if (elapsedSec <= 0) return;
		this.tokens = Math.min(this.capacity, this.tokens + elapsedSec * this.refillPerSecond);
		this.lastRefill = nowMs;
	}

	/** Non-blocking: returns true if a token was available and consumed. */
	async tryAcquire(): Promise<boolean> {
		this.refill();
		if (this.tokens >= 1) {
			this.tokens -= 1;
			return true;
		}
		return false;
	}
}

export type RateLimitKind = 'global' | 'session' | 'trading';

export class RateLimiter {
	private readonly global: TokenBucket;
	private readonly session: TokenBucket;
	private readonly trading: TokenBucket;

	constructor(now: Clock = () => Date.now()) {
		this.global = new TokenBucket(10, 10, now); // 10 req/s
		this.session = new TokenBucket(1, 1, now); // 1 req/s (POST /session)
		this.trading = new TokenBucket(10, 10, now); // 10 req/s (trading)
	}

	/** Every call passes the global bucket; session/trading add their own bucket. */
	async acquire(kind: RateLimitKind): Promise<boolean> {
		const okGlobal = await this.global.tryAcquire();
		if (!okGlobal) return false;
		if (kind === 'session') return this.session.tryAcquire();
		if (kind === 'trading') return this.trading.tryAcquire();
		return true;
	}
}
