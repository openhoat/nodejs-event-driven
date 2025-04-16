import { join } from 'node:path'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals'
import { baseDir } from '@test/util/base-dir.js'
import { mockModule } from '@test/util/testing-helper.js'

describe('unit tests', () => {
  describe('util', () => {
    describe('env', () => {
      let dotenvConfigMock: jest.Mock
      let loadEnv: jest.Mock<(envName?: string) => void>
      beforeAll(async () => {
        dotenvConfigMock = jest.fn()
        mockModule('dotenv', {
          config: dotenvConfigMock,
        })
      })
      describe.each([{}, { verbose: true }])(
        'given VERBOSE is $verbose',
        ({ verbose }) => {
          beforeEach(async () => {
            jest.resetModules()
            jest.resetAllMocks()
          })
          afterAll(() => {
            jest.restoreAllMocks()
          })
          describe('loadEnv', () => {
            beforeEach(async () => {
              if (verbose) {
                process.env.VERBOSE = 'true'
              }
              loadEnv = (await import('@test/util/env.js'))
                .loadEnv as jest.Mock<(envName?: string) => void>
            })
            test('should load environment variables with dotenv given no env name', async () => {
              // When
              loadEnv()
              // Then
              expect(dotenvConfigMock).toHaveBeenCalledTimes(2)
              expect(dotenvConfigMock).toHaveBeenNthCalledWith(1, {
                path: join(baseDir, '.env.local'),
              })
              expect(dotenvConfigMock).toHaveBeenNthCalledWith(2, {
                path: join(baseDir, '.env'),
              })
            })
            test('should load environment variables with dotenv given env name is staging', async () => {
              // When
              loadEnv('staging')
              // Then
              expect(dotenvConfigMock).toHaveBeenCalledTimes(3)
              expect(dotenvConfigMock).toHaveBeenNthCalledWith(1, {
                path: join(baseDir, '.env.local'),
              })
              expect(dotenvConfigMock).toHaveBeenNthCalledWith(2, {
                path: join(baseDir, '.env.staging'),
              })
              expect(dotenvConfigMock).toHaveBeenNthCalledWith(3, {
                path: join(baseDir, '.env'),
              })
            })
          })
        },
      )
    })
  })
})
