import { CapitalComApi } from '../../credentials/CapitalComApi.credentials';

describe('CapitalComApi credential', () => {
	const cred = new CapitalComApi();

	it('has the expected identity', () => {
		expect(cred.name).toBe('capitalComApi');
		expect(cred.displayName).toBe('Capital.com API');
		expect(cred.documentationUrl).toContain('github.com/SimonTarara62');
	});

	it('declares the four auth fields and nothing else', () => {
		const names = cred.properties.map((p) => p.name).sort();
		expect(names).toEqual(['apiKey', 'environment', 'identifier', 'password']);
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
		expect(String(req.baseURL)).toContain('demo-api-capital.backend-capital.com');
		expect(String(req.baseURL)).toContain('api-capital.backend-capital.com');
		expect((req.body as Record<string, unknown>).encryptedPassword).toBe(false);
	});
});
