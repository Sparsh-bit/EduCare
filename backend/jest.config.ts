import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    // Run the env-var setup BEFORE any module is imported by any test file
    setupFiles: ['<rootDir>/src/__tests__/jest.setup.ts'],
    clearMocks: true,
    forceExit: true,
    detectOpenHandles: true,
    testTimeout: 15000,
};

export default config;
