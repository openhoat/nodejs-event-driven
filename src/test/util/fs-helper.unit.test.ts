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
          const expectedErrorMessage = 'File package.json is not a directory'
          const expectedError = new Error(expectedErrorMessage)
          // When
          const promise = createDirIfNeeded(join(baseDir, 'package.json'))
          // Then
          await expect(promise).rejects.toStrictEqual(expectedError)
        })
      })
      describe('createDirSyncIfNeeded', () => {
        test('should fail to create directory given existing package.json is not a directory', async () => {
          // Given
          const expectedErrorMessage = 'File package.json is not a directory'
          const expectedError = new Error(expectedErrorMessage)
          // When
          const fn = () => createDirSyncIfNeeded(join(baseDir, 'package.json'))
          // Then
          expect(fn).toThrowError(expectedError)
        })
      })
    })
  })
})
