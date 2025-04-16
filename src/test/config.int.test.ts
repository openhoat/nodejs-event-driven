import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { configSpec } from '@test/config.js'
import { buildConfig } from '@test/util/config-builder.js'

describe('integration tests', () => {
  describe('config', () => {
    beforeEach(() => {
      jest.resetModules()
    })
    test('should provide a configuration object based on environment variables', async () => {
      // When
      const config = buildConfig(configSpec)
      // Then
      expect(config).toMatchSnapshot()
    })
    test('should provide a configuration object based on environment variables given process.env.VERBOSE is true', async () => {
      // When
      process.env.VERBOSE = 'true'
      const config = buildConfig(configSpec)
      // Then
      expect(config).toMatchSnapshot()
    })
  })
})
