/**
 * Jest configuration for production readiness testing
 */

module.exports = {
  // Extend base Jest configuration
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Production test specific settings
  roots: ['<rootDir>/src'],
  
  // Test patterns for production tests
  testMatch: [
    '<rootDir>/src/**/*.production.test.ts',
    '<rootDir>/src/testing/**/*.test.ts',
    '<rootDir>/__tests__/production/**/*.test.ts'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/testing/**/*',
    '!src/**/*.mock.ts'
  ],
  
  // Coverage thresholds for production
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    // Critical services require higher coverage
    './src/services/encryption.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/services/storage.ts': {
      branches: 92,
      functions: 92,
      lines: 92,
      statements: 92
    }
  },
  
  // Production test setup
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/jest.production.setup.js'
  ],
  
  // Production-specific mocks
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // Timeout for long-running production tests
  testTimeout: 30000,
  
  // Reporters for production CI/CD
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'production-results.xml',
      suiteName: 'Production Readiness Tests'
    }],
    ['jest-html-reporters', {
      publicPath: 'test-reports',
      filename: 'production-report.html',
      pageTitle: 'Mainframe SDK Production Test Report'
    }]
  ],
  
  // Performance and memory settings
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest-production',
  
  // Transform configuration
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      isolatedModules: true
    }]
  },
  
  // Module resolution
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Global test environment variables
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    },
    'NODE_ENV': 'test',
    'MAINFRAME_ENVIRONMENT': 'production-test'
  },
  
  // Test result processing
  verbose: true,
  bail: false, // Continue running tests even if some fail
  
  // Only run production tests
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '\\.dev\\.test\\.',
    '\\.unit\\.test\\.'
  ]
};
