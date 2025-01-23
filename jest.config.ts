import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFiles: [
    '<rootDir>/jest.polyfills.js', // Load polyfills
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1', // Resolve path aliases
    '\\.(css|scss)$': 'identity-obj-proxy', // Mock CSS/SCSS modules
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js', // Mock static assets
    '^next/server$': '<rootDir>/__mocks__/next/server.ts', // Mock Next.js server APIs
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'], // Global test setup
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest', // Transform TypeScript files
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(node-fetch|whatwg-fetch)/)', // Transform specific node_modules
  ],
};

export default config;