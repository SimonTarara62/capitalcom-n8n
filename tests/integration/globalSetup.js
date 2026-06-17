const { rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

// Runs once before the integration suites: drop any session cached by a prior run
// so each `npm run test:integration` starts with a single fresh login.
module.exports = async () => {
	try {
		rmSync(join(tmpdir(), 'capitalcom-n8n-it-session.json'));
	} catch {
		/* no stale session */
	}
};
