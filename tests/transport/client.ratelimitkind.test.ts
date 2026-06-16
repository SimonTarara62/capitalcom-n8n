import { rateLimitKind } from '../../transport/client';

describe('rateLimitKind', () => {
	it('GET /session → global', () => {
		expect(rateLimitKind('GET', '/session')).toBe('global');
	});

	it('PUT /session → session', () => {
		expect(rateLimitKind('PUT', '/session')).toBe('session');
	});

	it('POST /session → session', () => {
		expect(rateLimitKind('POST', '/session')).toBe('session');
	});

	it('DELETE /session → session', () => {
		expect(rateLimitKind('DELETE', '/session')).toBe('session');
	});

	it('POST /positions → trading', () => {
		expect(rateLimitKind('POST', '/positions')).toBe('trading');
	});

	it('GET /markets → global', () => {
		expect(rateLimitKind('GET', '/markets')).toBe('global');
	});

	it('GET /positions → global (GET on a trading path is not trading)', () => {
		expect(rateLimitKind('GET', '/positions')).toBe('global');
	});
});
