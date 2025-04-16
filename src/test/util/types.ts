export type ValueOrFunction<T> = T | (() => T | Promise<T>)
