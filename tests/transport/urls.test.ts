import { apiBaseUrl, baseUrl, WS_URL } from '../../transport/urls';

describe('urls', () => {
	it('uses the demo host for demo', () => {
		expect(baseUrl('demo')).toBe('https://demo-api-capital.backend-capital.com');
		expect(apiBaseUrl('demo')).toBe('https://demo-api-capital.backend-capital.com/api/v1');
	});

	it('uses the live host for live', () => {
		expect(baseUrl('live')).toBe('https://api-capital.backend-capital.com');
		expect(apiBaseUrl('live')).toBe('https://api-capital.backend-capital.com/api/v1');
	});

	it('exposes the streaming URL', () => {
		expect(WS_URL).toBe('wss://api-streaming-capital.backend-capital.com/connect');
	});
});
