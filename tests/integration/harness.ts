import {
	CapitalClient,
	type CapitalCredentials,
	type SessionStore,
	type SessionTokens,
} from '../../transport';
import { fetchRequester } from './realRequester';

/** Reads DEMO creds from the environment (.env). Returns null if any are missing. */
export function loadDemoCreds(): CapitalCredentials | null {
	const apiKey = process.env.CAP_API_KEY;
	const identifier = process.env.CAP_IDENTIFIER;
	const password = process.env.CAP_API_PASSWORD;
	if (!apiKey || !identifier || !password) return null;
	// Hard-coded demo: integration tests must NEVER touch the live environment.
	return { apiKey, identifier, password, environment: 'demo' };
}

class MemoryStore implements SessionStore {
	private tokens: SessionTokens | null = null;
	get(): SessionTokens | null {
		return this.tokens;
	}
	set(tokens: SessionTokens): void {
		this.tokens = tokens;
	}
	clear(): void {
		this.tokens = null;
	}
}

/** Build a real CapitalClient against the demo API, or null when creds are absent. */
export function makeDemoClient(): CapitalClient | null {
	const credentials = loadDemoCreds();
	if (!credentials) return null;
	return new CapitalClient({ credentials, requester: fetchRequester, store: new MemoryStore() });
}

/** describe() when demo creds are present, describe.skip() otherwise (opt-in). */
export const describeIfCreds = loadDemoCreds() ? describe : describe.skip;
