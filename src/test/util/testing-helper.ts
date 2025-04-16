import { jest } from '@jest/globals'
import { isFunction } from '@test/util/type-guards.js'

export const mockModule = (moduleName: string, moduleMock: unknown) => {
  const moduleFactory: () => unknown | Promise<unknown> = isFunction(moduleMock)
    ? moduleMock
    : () => moduleMock
  jest.unstable_mockModule(moduleName, moduleFactory)
}

export const mockModules = (moduleMockPairs: [string, unknown][]) => {
  for (const [name, mock] of moduleMockPairs) {
    mockModule(name, mock)
  }
}
