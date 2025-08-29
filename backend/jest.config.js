module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: [],
  globalSetup: '<rootDir>/tests/jest.globalSetup.js',
  globalTeardown: '<rootDir>/tests/jest.globalTeardown.js',
  testTimeout: 20000,
};
