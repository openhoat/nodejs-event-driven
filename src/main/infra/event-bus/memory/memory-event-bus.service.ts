import { EventEmitter } from 'node:events'
import { BaseEventBusService } from '@main/base-event-bus.service.js'
import type { Logger } from '@main/util/logger.js'

export type MemoryEventBusServiceConfig = {
  logger?: Logger
  eventBusMemoryEmitDelay?: number
}

export default class MemoryEventBusService<
  E extends string = string,
> extends BaseEventBusService<E> {
  readonly #logger?: Logger
  readonly #emitDelay?: number
  readonly #eventEmitter: EventEmitter

  constructor(config: MemoryEventBusServiceConfig) {
    super()
    this.#logger = config.logger
    this.#emitDelay = config.eventBusMemoryEmitDelay
    this.#eventEmitter = new EventEmitter()
  }

  on<T>(eventName: E, listener: (data: T) => void) {
    this.#logger?.debug(`register listener for event: ${eventName}`)
    this.#eventEmitter.on(eventName, listener)
  }

  once<T>(eventName: E, listener: (data: T) => void) {
    this.#logger?.debug(`register once listener for event: ${eventName}`)
    this.#eventEmitter.once(eventName, listener)
  }

  off<T>(eventName: E, listener: (data: T) => void) {
    this.#logger?.debug(`unregister listener for event: ${eventName}`)
    this.#eventEmitter.off(eventName, listener)
  }

  send(eventName: E, data?: unknown) {
    if (this.#emitDelay) {
      this.#logger?.debug(
        `will send event later (${this.#emitDelay}ms): ${eventName} with ${String(data)}`,
      )
      setTimeout(() => {
        this.#eventEmitter.emit(eventName, data)
      }, this.#emitDelay)
      return
    }
    this.#logger?.debug(`sending event: ${eventName} with ${String(data)}`)
    process.nextTick(() => {
      this.#eventEmitter.emit(eventName, data)
    })
  }

  sendAndWait<T>(
    sendEventName: E,
    successEventName: E,
    errorEventName: E,
    data?: unknown,
  ): Promise<T> {
    this.#logger?.debug(
      `sending event ${sendEventName} and waiting for event ${successEventName}…`,
    )
    return super.sendAndWait(
      sendEventName,
      successEventName,
      errorEventName,
      data,
    )
  }

  start() {
    return Promise.resolve()
  }

  stop() {
    this.#eventEmitter.removeAllListeners()
    return Promise.resolve()
  }
}
