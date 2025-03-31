import { beforeEach, describe, expect, jest, test } from '@jest/globals'

describe('integration tests', () => {
  describe('config', () => {
    beforeEach(() => {
      jest.resetModules()
    })
    test('should provide a configuration object based on environment variables', async () => {
      // When
      const { default: config } = await import('@test/config/index.js')
      // Then
      expect(config).toMatchSnapshot()
    })
    test('should provide a configuration object based on environment variables given process.env.VERBOSE is true', async () => {
      // When
      process.env.VERBOSE = 'true'
      const { default: config } = await import('@test/config/index.js')
      // Then
      expect(config).toMatchSnapshot()
    })
  })
})
