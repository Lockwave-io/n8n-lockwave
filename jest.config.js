/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	globals: {
		'ts-jest': {
			tsconfig: 'tsconfig.test.json',
		},
	},
	roots: ['<rootDir>/tests'],
	testMatch: ['**/*.test.ts'],
	moduleFileExtensions: ['ts', 'js', 'json'],
	collectCoverageFrom: [
		'nodes/**/*.ts',
		'credentials/**/*.ts',
		'!**/index.ts',
	],
};
