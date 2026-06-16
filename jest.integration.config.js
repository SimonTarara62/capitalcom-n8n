/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/tests/integration'],
	testMatch: ['**/*.test.ts'],
	setupFiles: ['dotenv/config'],
	testTimeout: 30000,
};
