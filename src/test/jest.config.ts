import type { Config as JestConfig } from 'jest'

const { CI, VERBOSE } = process.env

export const isCi = CI === 'true'

export const isVerbose = VERBOSE === 'true'

const config: JestConfig = {
  collectCoverageFrom: ['<rootDir>/src/main/**'],
  coverageDirectory: '<rootDir>/dist/coverage',
  coverageReporters: isCi ? ['text', 'cobertura', 'lcov'] : ['text', 'html'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@main/(.*).js$': '<rootDir>/src/main/$1',
    '^@test/(.*).js$': '<rootDir>/src/test/$1',
  },
  rootDir: '../..',
  roots: ['<rootDir>/src'],
  preset: 'ts-jest',
  setupFiles: ['<rootDir>/src/test/jest-setup.ts'],
  silent: !isVerbose,
  testMatch: ['<rootDir>/src/test/**/*.test.ts'],
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      { useESM: true, tsconfig: '<rootDir>/tsconfig.test.json' },
    ],
  },
}

export default config
