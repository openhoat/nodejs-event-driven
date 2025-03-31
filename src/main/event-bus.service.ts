import { BaseEventBusService } from '@main/base-event-bus.service.js'
import FsEventBusService, {
  type FsEventBusServiceConfig,
} from '@main/infra/event-bus/fs/fs-event-bus.service.js'
import MemoryEventBusService, {
  type MemoryEventBusServiceConfig,
} from '@main/infra/event-bus/memory/memory-event-bus.service.js'
import RabbitmqEventBusService, {
  type RabbitmqEventBusServiceConfig,
} from '@main/infra/event-bus/rabbitmq/rabbitmq-event-bus.service.js'
import RedisEventBusService, {
  type RedisEventBusServiceConfig,
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

export default class EventBusService<
  E extends string = string,
> extends BaseEventBusService<E> {
  readonly #eventBusServiceImpl: BaseEventBusService

  constructor(config: EventBusServiceConfig) {
    super()
    if (config.type === 'fs') {
      this.#eventBusServiceImpl = new FsEventBusService(config)
    } else if (config.type === 'redis') {
      this.#eventBusServiceImpl = new RedisEventBusService(config)
    } else if (config.type === 'rabbitmq') {
      this.#eventBusServiceImpl = new RabbitmqEventBusService(config)
    } else {
      this.#eventBusServiceImpl = new MemoryEventBusService(config)
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
    data?: unknown,
  ): Promise<T> {
    return this.#eventBusServiceImpl.sendAndWait(
      sendEventName,
      successEventName,
      errorEventName,
      data,
    )
  }

  async start() {
    await this.#eventBusServiceImpl.start()
  }

  async stop() {
    await this.#eventBusServiceImpl.stop()
  }
}
