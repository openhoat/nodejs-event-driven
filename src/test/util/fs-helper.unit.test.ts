import type { BigIntStats, PathLike, StatOptions, Stats } from 'node:fs'
import { join } from 'node:path'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals'
import { baseDir } from '@test/util/base-dir.js'
import { mockModule } from '@test/util/testing-helper.js'

describe('unit tests', () => {
  describe('util', () => {
    describe('fs-helper', () => {
      let fakeFs: jest.Mocked<{
        mkdir: () => Promise<unknown>
        readdir: () => Promise<unknown>
        readFile: () => Promise<unknown>
        stat: (
          path: PathLike,
          opts?: StatOptions,
        ) => Promise<Stats | BigIntStats>
        unlink: () => Promise<unknown>
      }>
      let fsHelperModule: {
        relativePathIsFile: (
          baseDir: string,
          fileRelPath: string,
          filenamePattern?: RegExp,
        ) => Promise<boolean>
        listFilesInDirectory: (
          baseDir: string,
          filenamePattern?: RegExp,
        ) => Promise<string[]>
        pollFile: (
          fileInfos: { timestamp: number; filePath: string; data: unknown }[],
          filePath: string,
          fileType?: 'json' | 'text',
        ) => Promise<void>
      }
      let fakeLock: jest.Mock
      beforeAll(async () => {
        fakeFs = {
          mkdir: jest.fn(),
          readdir: jest.fn(),
          readFile: jest.fn(),
          stat: jest.fn(),
          unlink: jest.fn(),
        }
        mockModule('node:fs/promises', fakeFs)
        fakeLock = jest.fn()
        mockModule('proper-lockfile', { lock: fakeLock })
        fsHelperModule = await import('@main/util/fs.helper.js')
      })
      afterEach(() => {
        jest.resetAllMocks()
      })
      afterAll(() => {
        jest.restoreAllMocks()
      })
      describe('relativePathIsFile', () => {
        let relativePathIsFile: (typeof fsHelperModule)['relativePathIsFile']
        beforeAll(() => {
          relativePathIsFile = fsHelperModule.relativePathIsFile
        })
        test('should throw an error given filename stat failed', async () => {
          // Given
          const error = new Error('oops')
          fakeFs.stat.mockRejectedValue(error)
          const fileRelPath = 'package.json'
          const filePath = join(baseDir, fileRelPath)
          // When
          const promise = relativePathIsFile(baseDir, fileRelPath)
          // Then
          await expect(promise).rejects.toBe(error)
          expect(fakeFs.stat).toHaveBeenCalledTimes(1)
          expect(fakeFs.stat).toHaveBeenCalledWith(filePath)
        })
      })
      describe('listFilesInDirectory', () => {
        let listFilesInDirectory: (typeof fsHelperModule)['listFilesInDirectory']
        beforeAll(() => {
          listFilesInDirectory = fsHelperModule.listFilesInDirectory
        })
        test('should throw an error given filename stat failed', async () => {
          // Given
          const error = new Error('oops')
          fakeFs.readdir.mockRejectedValue(error)
          // When
          const promise = listFilesInDirectory(baseDir)
          // Then
          await expect(promise).rejects.toBe(error)
          expect(fakeFs.readdir).toHaveBeenCalledTimes(1)
          expect(fakeFs.readdir).toHaveBeenCalledWith(baseDir, {
            recursive: true,
          })
        })
      })
      describe('pollFile', () => {
        let pollFile: (typeof fsHelperModule)['pollFile']
        beforeAll(() => {
          pollFile = fsHelperModule.pollFile
        })
        test('should do nothing given filename is not valid', async () => {
          // Given
          const fileInfos: {
            timestamp: number
            filePath: string
            data: unknown
          }[] = []
          const filePath = 'not-valid-fake-test-file'
          const fileType: 'json' | 'text' = 'json'
          // When
          await pollFile(fileInfos, filePath, fileType)
          // Then
          expect(fileInfos).toStrictEqual([])
        })
        test('should return file content given file type is text', async () => {
          // Given
          const fileInfos: {
            timestamp: number
            filePath: string
            data: unknown
          }[] = []
          const fileTimestamp = 123456
          const filePath = `event-${fileTimestamp}.data`
          const fileType: 'json' | 'text' = 'text'
          const fileContent = 'This is a file content'
          fakeFs.readFile.mockResolvedValue(fileContent)
          // When
          await pollFile(fileInfos, filePath, fileType)
          // Then
          expect(fileInfos).toStrictEqual([
            {
              data: fileContent,
              filePath: filePath,
              timestamp: fileTimestamp,
            },
          ])
        })
        test('should throw error given reading file failed', async () => {
          // Given
          const fileInfos: {
            timestamp: number
            filePath: string
            data: unknown
          }[] = []
          const fileTimestamp = 123456
          const filePath = `event-${fileTimestamp}.data`
          const fileType: 'json' | 'text' = 'text'
          const expectedErrorMessage = 'oops'
          const expectedError = new Error(expectedErrorMessage)
          fakeFs.readFile.mockRejectedValue(expectedError)
          // When
          const promise = pollFile(fileInfos, filePath, fileType)
          // Then
          await expect(promise).rejects.toStrictEqual(expectedError)
          expect(fileInfos).toStrictEqual([])
        })
        test('should do nothing given file does not exist', async () => {
          // Given
          const fileInfos: {
            timestamp: number
            filePath: string
            data: unknown
          }[] = []
          const fileTimestamp = 123456
          const filePath = `event-${fileTimestamp}.data`
          const fileType: 'json' | 'text' = 'text'
          const expectedErrorMessage = 'oops'
          const expectedError: Error & { code?: string } = new Error(
            expectedErrorMessage,
          )
          expectedError.code = 'ENOENT'
          fakeFs.readFile.mockRejectedValue(expectedError)
          // When
          await pollFile(fileInfos, filePath, fileType)
          // Then
          expect(fileInfos).toStrictEqual([])
        })
      })
    })
  })
})
