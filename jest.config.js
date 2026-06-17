/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/tests'],
	testMatch: ['**/*.test.ts'],
	testPathIgnorePatterns: ['/node_modules/', '/tests/integration/'],
	transform: {
		'^.+\\.tsx?$': ['ts-jest', { isolatedModules: true }],
	},
	clearMocks: true,
};
