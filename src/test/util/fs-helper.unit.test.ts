import { join } from 'node:path'
import { describe, expect, test } from '@jest/globals'
import {
  createDirIfNeeded,
  createDirSyncIfNeeded,
} from '@main/util/fs.helper.js'
import { baseDir } from '@test/util/base-dir.js'

describe('unit tests', () => {
  describe('util', () => {
    describe('fs helper', () => {
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
    })
  })
})
