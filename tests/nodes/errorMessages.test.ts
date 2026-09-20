// Test-only: these Node built-ins are banned in the published node, never in tests.
// eslint-disable-next-line @n8n/community-nodes/no-restricted-imports
import { readFileSync, readdirSync } from 'node:fs';
// eslint-disable-next-line @n8n/community-nodes/no-restricted-imports
import { join } from 'node:path';

// eslint-disable-next-line @n8n/community-nodes/no-restricted-globals
const ACTIONS_DIR = join(__dirname, '../../nodes/CapitalCom/actions');

describe('error messages', () => {
	const files = readdirSync(ACTIONS_DIR).filter((f) => f.endsWith('.ts'));

	it.each(files)('%s throws no bare Error', (file) => {
		const src = readFileSync(join(ACTIONS_DIR, file), 'utf-8');
		expect(src).not.toMatch(/throw new Error\(/);
	});

	it.each(files)('%s avoids the words error/problem/failure in messages', (file) => {
		const src = readFileSync(join(ACTIONS_DIR, file), 'utf-8');
		const messages = [...src.matchAll(/NodeOperationError\([^,]+,\s*(['"`])((?:\\.|(?!\1).)*)\1/g)].map(
			(m) => m[2],
		);
		for (const msg of messages) {
			expect(msg.toLowerCase()).not.toMatch(/\berror\b|\bproblem\b|\bfailure\b/);
		}
	});
});
