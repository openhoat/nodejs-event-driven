import type { BaseEventBusServiceBuilder } from '@main/domain/event-bus/base-event-bus.service.js'
import { EventEmitterBusService } from '@main/infra/event-bus/event-emitter/event-emitter-bus.service.js'
import type { Logger } from '@main/util/logger.js'

export type MemoryEventBusServiceConfig = {
  logger?: Logger
  eventBusMemoryEmitDelay?: number
}

export class MemoryEventBusService<
  E extends string = string,
> extends EventEmitterBusService<E> {
  readonly #emitDelay?: number

  constructor(config: MemoryEventBusServiceConfig) {
    super(config)
    this.#emitDelay = config.eventBusMemoryEmitDelay
  }

  send(eventName: E, data?: unknown) {
    if (this.#emitDelay) {
      this.logger?.debug(
        `will send event later (${this.#emitDelay}ms): ${eventName} with ${String(data)}`,
      )
      setTimeout(() => {
        this.eventEmitter.emit(eventName, data)
      }, this.#emitDelay)
      return
    }
    this.logger?.debug(`sending event: ${eventName} with ${String(data)}`)
    process.nextTick(() => {
      this.eventEmitter.emit(eventName, data)
    })
  }

  start() {
    return Promise.resolve()
  }

  stop() {
    this.eventEmitter.removeAllListeners()
    return Promise.resolve()
  }
}

export type MemoryEventBusServiceBuilder = BaseEventBusServiceBuilder<
  MemoryEventBusServiceConfig,
  MemoryEventBusService
>

export const createMemoryEventBusService: MemoryEventBusServiceBuilder = (
  config,
) => new MemoryEventBusService(config)
