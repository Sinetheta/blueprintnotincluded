module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__', '<rootDir>/app', '<rootDir>/lib'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  collectCoverageFrom: [
    'app/**/*.ts',
    'lib/src/**/*.ts',
    '!app/**/*.d.ts',
    '!lib/**/*.d.ts',
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  // Map lib imports to TypeScript source instead of compiled JS
  moduleNameMapper: {
    '^(.*/lib)/index$': '$1/index.ts',
    '^(.*/lib/src/.*)$': '$1.ts',
  },
  // Include lib directory for transformation
  transformIgnorePatterns: [
    'node_modules/(?!lib)',
  ],
  // Run tests sequentially to prevent database conflicts
  maxWorkers: 1,

  verbose: true,
};
