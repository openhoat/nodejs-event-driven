import type { EventEmitter } from 'node:events'
import type { Logger } from '@main/util/logger.js'
import type { Service } from '@main/util/service.js'

export type BaseEventBusServiceConfig = {
  logger?: Logger
}

export type BaseEventBusServiceBuilder<
  C extends BaseEventBusServiceConfig,
  T extends BaseEventBusService = BaseEventBusService,
> = (config: C) => T

export type EventBusServiceErrorListener = (data: unknown) => void

export interface BaseEventBusService<E extends string = string>
  extends Service {
  get logger(): Logger | undefined

  get eventEmitter(): EventEmitter

  get errorListener(): EventBusServiceErrorListener | null

  send(eventName: E, data?: unknown): void

  on<T>(eventName: E, listener: (data: T) => void): void

  onError(listener: (data: unknown) => void): void

  once<T>(eventName: E, listener: (data: T) => void): void

  off<T>(eventName: E, listener: (data: T) => void): void

  sendAndWait<T>(
    sendEventName: E,
    successEventName: E,
    errorEventName: E,
    data: unknown,
    options?: { timeout?: number },
  ): Promise<T>

  waitFor<T>(eventName: E, options?: { timeout?: number }): Promise<T>
}
