import { RateLimiter, TokenBucket } from '../../transport/rateLimit';

describe('TokenBucket', () => {
	it('grants tokens up to capacity immediately', async () => {
		let t = 0;
		const bucket = new TokenBucket(2, 2, () => t);
		expect(await bucket.tryAcquire()).toBe(true);
		expect(await bucket.tryAcquire()).toBe(true);
		expect(await bucket.tryAcquire()).toBe(false); // empty
	});

	it('refills over time', async () => {
		let t = 0;
		const bucket = new TokenBucket(1, 1, () => t); // 1 token/sec
		expect(await bucket.tryAcquire()).toBe(true);
		expect(await bucket.tryAcquire()).toBe(false);
		t = 1000; // advance 1s → +1 token
		expect(await bucket.tryAcquire()).toBe(true);
	});
});

describe('RateLimiter', () => {
	it('routes a trading path through the trading bucket', async () => {
		let t = 0;
		const rl = new RateLimiter(() => t);
		// global capacity is high; just assert it resolves true for a normal call
		expect(await rl.acquire('global')).toBe(true);
		expect(await rl.acquire('trading')).toBe(true);
		expect(await rl.acquire('session')).toBe(true);
	});
});
