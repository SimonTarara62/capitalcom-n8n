/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/tests/integration'],
	testMatch: ['**/*.test.ts'],
	setupFiles: ['dotenv/config'],
	globalSetup: '<rootDir>/tests/integration/globalSetup.js',
	maxWorkers: 1,
	testTimeout: 30000,
};
