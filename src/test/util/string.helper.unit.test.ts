import { describe, expect, test } from '@jest/globals'
import { toCamelCase } from '@test/util/string.helper.js'

describe('unit tests', () => {
  describe('util', () => {
    describe('string helper', () => {
      describe('toCamelCase', () => {
        type TestCase = {
          text: string
          expectedResult: string
        }
        const testCases: TestCase[] = [
          { text: 'foo', expectedResult: 'foo' },
          { text: 'foo bar', expectedResult: 'fooBar' },
          { text: 'foo-bar', expectedResult: 'fooBar' },
          { text: 'foo_bar', expectedResult: 'fooBar' },
          { text: 'Foo', expectedResult: 'foo' },
          { text: 'Foo bar', expectedResult: 'fooBar' },
          { text: 'Foo-bar', expectedResult: 'fooBar' },
          { text: 'Foo_bar', expectedResult: 'fooBar' },
          { text: 'Foo Bar', expectedResult: 'fooBar' },
          { text: 'Foo-Bar', expectedResult: 'fooBar' },
          { text: 'Foo_Bar', expectedResult: 'fooBar' },
        ]
        test.each(testCases)(
          'should return "$expectedResult" given "$text"',
          ({ text, expectedResult }) => {
            const result = toCamelCase(text)
            expect(result).toBe(expectedResult)
          },
        )
      })
    })
  })
})
