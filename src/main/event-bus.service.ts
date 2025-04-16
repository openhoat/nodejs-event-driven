import type {
  BaseEventBusService,
  BaseEventBusServiceBuilder,
} from '@main/domain/event-bus/base-event-bus.service.js'
import { EventEmitterBusService } from '@main/infra/event-bus/event-emitter/event-emitter-bus.service.js'
import {
  type FsEventBusServiceConfig,
  createFsEventBusService,
} from '@main/infra/event-bus/fs/fs-event-bus.service.js'
import {
  type MemoryEventBusServiceConfig,
  createMemoryEventBusService,
} from '@main/infra/event-bus/memory/memory-event-bus.service.js'
import {
  type RabbitmqEventBusServiceConfig,
  createRabbitmqEventBusService,
} from '@main/infra/event-bus/rabbitmq/rabbitmq-event-bus.service.js'
import {
  type RedisEventBusServiceConfig,
  createRedisEventBusService,
} from '@main/infra/event-bus/redis/redis-event-bus.service.js'

export type EventBusServiceConfig =
  | ({
      type: 'memory'
    } & MemoryEventBusServiceConfig)
  | ({
      type: 'fs'
    } & FsEventBusServiceConfig)
  | ({
      type: 'redis'
    } & RedisEventBusServiceConfig)
  | ({
      type: 'rabbitmq'
    } & RabbitmqEventBusServiceConfig)

export class EventBusService<
  E extends string = string,
> extends EventEmitterBusService<E> {
  readonly #eventBusServiceImpl: BaseEventBusService

  constructor(config: EventBusServiceConfig) {
    super(config)
    switch (config.type) {
      case 'fs':
        this.#eventBusServiceImpl = createFsEventBusService(config)
        break
      case 'redis':
        this.#eventBusServiceImpl = createRedisEventBusService(config)
        break
      case 'rabbitmq':
        this.#eventBusServiceImpl = createRabbitmqEventBusService(config)
        break
      default:
        this.#eventBusServiceImpl = createMemoryEventBusService(config)
    }
  }

  send(eventName: E, data?: unknown) {
    this.#eventBusServiceImpl.send(eventName, data)
  }

  on<T>(eventName: E, listener: (data: T) => void) {
    this.#eventBusServiceImpl.on(eventName, listener)
  }

  once<T>(eventName: E, listener: (data: T) => void) {
    this.#eventBusServiceImpl.once(eventName, listener)
  }

  off<T>(eventName: E, listener: (data: T) => void) {
    this.#eventBusServiceImpl.off(eventName, listener)
  }

  sendAndWait<T>(
    sendEventName: E,
    successEventName: E,
    errorEventName: E,
    data: unknown,
    options?: { timeout?: number },
  ): Promise<T> {
    return this.#eventBusServiceImpl.sendAndWait(
      sendEventName,
      successEventName,
      errorEventName,
      data,
      options,
    )
  }

  async start() {
    await this.#eventBusServiceImpl.start()
  }

  async stop() {
    await this.#eventBusServiceImpl.stop()
  }
}

export const createEventBusService: BaseEventBusServiceBuilder<
  EventBusServiceConfig,
  EventBusService
> = (config) => new EventBusService(config)
