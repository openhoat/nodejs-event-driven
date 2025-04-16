import type { ValueOrFunction } from '@test/util/types.js'

export const isFunction = <T>(
  v: ValueOrFunction<T>,
): v is () => T | Promise<T> => typeof v === 'function'
