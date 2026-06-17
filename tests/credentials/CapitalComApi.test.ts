import { CapitalComApi } from '../../credentials/CapitalComApi.credentials';

describe('CapitalComApi credential', () => {
	const cred = new CapitalComApi();

	it('has the expected identity', () => {
		expect(cred.name).toBe('capitalComApi');
		expect(cred.displayName).toBe('Capital.com (Unofficial) API');
		expect(cred.documentationUrl).toContain('github.com/SimonTarara62');
	});

	it('declares the four auth fields (ignoring the notice banner)', () => {
		const names = cred.properties
			.filter((p) => p.type !== 'notice')
			.map((p) => p.name)
			.sort();
		expect(names).toEqual(['apiKey', 'environment', 'identifier', 'password']);
	});

	it('shows an unofficial notice', () => {
		const notice = cred.properties.find((p) => p.type === 'notice');
		expect(notice).toBeDefined();
		expect(notice!.displayName.toLowerCase()).toContain('unofficial');
		expect(notice!.displayName.toLowerCase()).toContain('not affiliated');
	});

	it('masks the secret fields', () => {
		const byName = Object.fromEntries(cred.properties.map((p) => [p.name, p]));
		expect(byName.apiKey.typeOptions?.password).toBe(true);
		expect(byName.password.typeOptions?.password).toBe(true);
		expect(byName.environment.default).toBe('demo');
	});

	it('tests credentials by logging in against the right host', () => {
		const req = cred.test.request;
		expect(req.method).toBe('POST');
		expect(req.url).toBe('/api/v1/session');

		const baseURL = String(req.baseURL);

		// Must contain the ternary condition that selects the environment.
		expect(baseURL).toContain('environment === "live"');

		// Both host literals must be present; the demo host is verified by substring.
		expect(baseURL).toContain('https://demo-api-capital.backend-capital.com');

		// The live host must appear as a standalone literal (preceded by a quote)
		// so the assertion fails if only the "demo-" prefix were changed, not if
		// the string merely contains the demo host (which is a superset).
		expect(baseURL).toContain('"https://api-capital.backend-capital.com"');

		expect((req.body as Record<string, unknown>).encryptedPassword).toBe(false);
	});
});
