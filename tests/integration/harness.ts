import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

/** Where the shared demo session is cached so all suites reuse one login (cleared per run by globalSetup). */
export const SESSION_FILE = join(tmpdir(), 'capitalcom-n8n-it-session.json');

/** SessionStore shared across integration suites via a temp file (avoids concurrent re-login). */
class FileSessionStore implements SessionStore {
	get(): SessionTokens | null {
		try {
			return existsSync(SESSION_FILE)
				? (JSON.parse(readFileSync(SESSION_FILE, 'utf8')) as SessionTokens)
				: null;
		} catch {
			return null;
		}
	}
	set(tokens: SessionTokens): void {
		writeFileSync(SESSION_FILE, JSON.stringify(tokens), { mode: 0o600 });
	}
	clear(): void {
		try {
			rmSync(SESSION_FILE);
		} catch {
			/* nothing to clear */
		}
	}
}

/** Build a real CapitalClient against the demo API, or null when creds are absent. */
export function makeDemoClient(): CapitalClient | null {
	const credentials = loadDemoCreds();
	if (!credentials) return null;
	return new CapitalClient({ credentials, requester: fetchRequester, store: new FileSessionStore() });
}

/** describe() when demo creds are present, describe.skip() otherwise (opt-in). */
export const describeIfCreds = loadDemoCreds() ? describe : describe.skip;
