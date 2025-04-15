import { BaseEventBusService } from '@main/base-event-bus.service.js'
import type { Logger } from '@main/util/logger.js'
import type { RedisClientType } from 'redis'

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
  static readonly DEFAULT_KEY_PREFIX = 'events'

  readonly #logger?: Logger
  #redisPublisher: RedisClientType | null = null
  #redisSubscriber: RedisClientType | null = null
  readonly #keyPrefix: string
  readonly #redisConfig: {
    database?: number
    keyPrefix: string
    name?: string
    logger?: Logger
    password?: string
    url?: string
    username?: string
  }

  constructor(config: RedisEventBusServiceConfig) {
    super()
    this.#logger = config.logger
    this.#keyPrefix =
      config.keyPrefix ?? RedisEventBusService.DEFAULT_KEY_PREFIX
    this.#redisConfig = { ...config, keyPrefix: this.#keyPrefix }
  }

  #createRedisListener<T>(
    eventName: E,
    listener: (data: T) => void,
    once = false,
  ) {
    return (message: string) => {
      if (once) {
        this.off(eventName)
      }
      const data = JSON.parse(message) as T
      listener(data)
    }
  }

  on<T>(eventName: E, listener: (data: T) => void) {
    const redisSubscriber = this.#redisSubscriber
    if (!redisSubscriber) {
      return
    }
    const channel = `${this.#keyPrefix}:${eventName}`
    this.#logger?.debug(`register listener for channel: ${channel}`)
    const redisListener = this.#createRedisListener(eventName, listener)
    void redisSubscriber.subscribe(channel, redisListener)
  }

  once<T>(eventName: E, listener: (data: T) => void) {
    const redisSubscriber = this.#redisSubscriber
    if (!redisSubscriber) {
      return
    }
    const channel = `${this.#keyPrefix}:${eventName}`
    this.#logger?.debug(`register once listener for channel: ${channel}`)
    const redisListener = this.#createRedisListener(eventName, listener, true)
    void redisSubscriber.subscribe(channel, redisListener)
  }

  off(eventName: E) {
    const redisSubscriber = this.#redisSubscriber
    if (!redisSubscriber) {
      return
    }
    const channel = `${this.#keyPrefix}:${eventName}`
    this.#logger?.debug(`unregister listener for channel: ${channel}`)
    void redisSubscriber.unsubscribe(channel)
  }

  send(eventName: E, data?: unknown) {
    const redisPublisher = this.#redisPublisher
    if (!redisPublisher) {
      return
    }
    const channel = `${this.#keyPrefix}:${eventName}`
    this.#logger?.debug(`sending ${String(data)} to channel ${channel}`)
    void redisPublisher.publish(channel, JSON.stringify(data))
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
    const { createClient } = await import('redis')
    this.#redisPublisher = createClient(this.#redisConfig)
    this.#redisSubscriber = createClient(this.#redisConfig)
    await this.#redisPublisher.connect()
    await this.#redisSubscriber.connect()
  }

  async stop() {
    const redisPublisher = this.#redisPublisher
    if (redisPublisher) {
      await redisPublisher.quit()
      this.#redisPublisher = null
    }
    const redisSubscriber = this.#redisSubscriber
    if (redisSubscriber) {
      await redisSubscriber.quit()
      this.#redisSubscriber = null
    }
  }
}
