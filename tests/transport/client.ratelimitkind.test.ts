import { rateLimitKind } from '../../transport/client';

describe('rateLimitKind', () => {
	it('GET /session → global', () => {
		expect(rateLimitKind('GET', '/session')).toBe('global');
	});

	it('PUT /session → global (switchAccount is a regular write, not a login)', () => {
		expect(rateLimitKind('PUT', '/session')).toBe('global');
	});

	it('POST /session → session (login is rate-limited by the session bucket)', () => {
		expect(rateLimitKind('POST', '/session')).toBe('session');
	});

	it('DELETE /session → global (logout is a regular write, not a login)', () => {
		expect(rateLimitKind('DELETE', '/session')).toBe('global');
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
