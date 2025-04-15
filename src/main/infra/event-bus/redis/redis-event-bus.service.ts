import { BaseEventBusService } from '@main/base-event-bus.service.js'
import type { Logger } from '@main/util/logger.js'
import { type RedisClientType, createClient } from 'redis'

export type RedisEventBusServiceConfig = {
  database?: number
  keyPrefix?: string
  name?: string
  logger?: Logger
  password?: string
  url?: string
  username?: string
}

export default class RedisEventBusService<
  E extends string = string,
> extends BaseEventBusService<E> {
  readonly #logger?: Logger
  readonly #redisPublisher: RedisClientType
  readonly #redisSubscriber: RedisClientType
  readonly #keyPrefix: string

  constructor(config: RedisEventBusServiceConfig) {
    super()
    this.#logger = config.logger
    this.#keyPrefix = config.keyPrefix ?? 'events'
    this.#redisPublisher = createClient(config)
    this.#redisSubscriber = createClient(config)
  }

  #createRedisListener<T>(
    eventName: E,
    listener: (data: T) => void,
    once?: boolean,
  ) {
    return (message: string) => {
      if (once) {
        void this.off(eventName)
      }
      const data = JSON.parse(message) as T
      listener(data)
    }
  }

  async on<T>(eventName: E, listener: (data: T) => void) {
    const channel = `${this.#keyPrefix}:${eventName}`
    this.#logger?.debug(`register listener for channel: ${channel}`)
    const redisListener = this.#createRedisListener(eventName, listener)
    await this.#redisSubscriber.subscribe(channel, redisListener)
  }

  async once<T>(eventName: E, listener: (data: T) => void) {
    const channel = `${this.#keyPrefix}:${eventName}`
    this.#logger?.debug(`register once listener for channel: ${channel}`)
    const redisListener = this.#createRedisListener(eventName, listener, true)
    await this.#redisSubscriber.subscribe(channel, redisListener)
  }

  async off(eventName: E) {
    const channel = `${this.#keyPrefix}:${eventName}`
    this.#logger?.debug(`unregister listener for channel: ${channel}`)
    await this.#redisSubscriber.unsubscribe(channel)
  }

  async send(eventName: E, data?: unknown) {
    const channel = `${this.#keyPrefix}:${eventName}`
    this.#logger?.debug(`sending ${String(data)} to channel ${channel}`)
    await this.#redisPublisher.publish(channel, JSON.stringify(data))
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

  async start() {
    await this.#redisPublisher.connect()
    await this.#redisSubscriber.connect()
  }

  async stop() {
    await this.#redisPublisher.quit()
    await this.#redisSubscriber.quit()
  }
}
