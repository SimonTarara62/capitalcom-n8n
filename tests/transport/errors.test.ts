import { CapitalApiError, CapitalAuthError, extractErrorMessage } from '../../transport/errors';

describe('extractErrorMessage', () => {
	it('reads Capital.com errorCode shape', () => {
		expect(extractErrorMessage(400, { errorCode: 'error.invalid.epic' })).toBe('error.invalid.epic');
	});

	it('falls back to message then error keys', () => {
		expect(extractErrorMessage(400, { message: 'bad' })).toBe('bad');
		expect(extractErrorMessage(400, { error: 'nope' })).toBe('nope');
	});

	it('stringifies an unknown object body', () => {
		expect(extractErrorMessage(400, { foo: 1 })).toBe('{"foo":1}');
	});

	it('truncates long string bodies', () => {
		const long = 'x'.repeat(250);
		const out = extractErrorMessage(500, long);
		expect(out.endsWith('...')).toBe(true);
		expect(out.length).toBe(203);
	});

	it('uses a generic message for empty bodies', () => {
		expect(extractErrorMessage(502, null)).toBe('HTTP 502');
	});
});

describe('error classes', () => {
	it('CapitalAuthError is a CapitalApiError', () => {
		const e = new CapitalAuthError('AUTH', 401);
		expect(e).toBeInstanceOf(CapitalApiError);
		expect(e.statusCode).toBe(401);
	});
});
