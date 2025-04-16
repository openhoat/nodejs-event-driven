import { join } from 'node:path'
import { describe, expect, test } from '@jest/globals'
import {
  createDirIfNeeded,
  createDirSyncIfNeeded,
  relativePathIsFile,
} from '@main/util/fs.helper.js'
import { baseDir } from '@test/util/base-dir.js'

describe('integration tests', () => {
  describe('util', () => {
    describe('fs-helper', () => {
      describe('createDirIfNeeded', () => {
        test('should fail to create directory given existing package.json is not a directory', async () => {
          // Given
          const filePath = join(baseDir, 'package.json')
          const expectedErrorMessage = `File ${filePath} is not a directory`
          const expectedError = new Error(expectedErrorMessage)
          // When
          const promise = createDirIfNeeded(filePath)
          // Then
          await expect(promise).rejects.toStrictEqual(expectedError)
        })
      })
      describe('createDirSyncIfNeeded', () => {
        test('should fail to create directory given existing package.json is not a directory', async () => {
          // Given
          const filePath = join(baseDir, 'package.json')
          const expectedErrorMessage = `File ${filePath} is not a directory`
          const expectedError = new Error(expectedErrorMessage)
          // When
          const fn = () => createDirSyncIfNeeded(filePath)
          // Then
          expect(fn).toThrowError(expectedError)
        })
      })
      describe('relativePathIsFile', () => {
        test('should return false given filename does not match pattern', async () => {
          // Given
          const fileRelPath = 'package.json'
          const filenamePattern = /.ts$/
          // When
          const isFile = await relativePathIsFile(
            baseDir,
            fileRelPath,
            filenamePattern,
          )
          // Then
          expect(isFile).toBe(false)
        })
        test('should return false given filename does exist', async () => {
          // Given
          const fileRelPath = 'unknown_file'
          const filenamePattern = /.ts$/
          // When
          const isFile = await relativePathIsFile(
            baseDir,
            fileRelPath,
            filenamePattern,
          )
          // Then
          expect(isFile).toBe(false)
        })
      })
    })
  })
})
