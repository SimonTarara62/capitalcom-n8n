/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/tests/integration'],
	testMatch: ['**/*.test.ts'],
	setupFiles: ['dotenv/config'],
	globalSetup: '<rootDir>/tests/integration/globalSetup.js',
	maxWorkers: 1,
	transform: {
		'^.+\\.tsx?$': ['ts-jest', { isolatedModules: true }],
	},
	testTimeout: 30000,
};
