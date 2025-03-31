import { BaseEventBusService } from '@main/base-event-bus.service.js'
import type { Logger } from '@main/util/logger.js'
import amqp, { type Channel } from 'amqplib'

export type RabbitmqEventBusServiceConfig = {
  logger?: Logger
  url?: string
}

export default class RabbitmqEventBusService<
  E extends string = string,
> extends BaseEventBusService<E> {
  readonly #logger?: Logger
  #connection?: amqp.ChannelModel
  readonly #registeredChannel: Record<E, Channel> = {} as Record<E, Channel>
  readonly #url: string

  constructor(config: RabbitmqEventBusServiceConfig) {
    super()
    this.#url = config.url ?? 'amqp://guest:guest@localhost:5672'
    this.#logger = config.logger
  }

  #checkConnection() {
    const connection = this.#connection
    if (!connection) {
      throw new Error('Connection is not initialized')
    }
    return connection
  }

  async #closeRegisteredChannels() {
    await Promise.all(
      (Object.keys(this.#registeredChannel) as E[]).map(async (eventName) => {
        const channel = this.#registeredChannel[eventName]
        await channel.cancel(eventName)
        await this.off(eventName)
      }),
    )
  }

  async #createChannel(eventName: E) {
    const connection = this.#checkConnection()
    const channel = await connection.createChannel()
    this.#registeredChannel[eventName] = channel
    await channel.assertQueue(eventName, { durable: false })
    return channel
  }

  async #consumeQueue<T>(
    eventName: E,
    listener: (data: T) => void,
    once?: boolean,
  ) {
    if (once) {
      this.#logger?.debug(`register once listener for channel: ${eventName}`)
    } else {
      this.#logger?.debug(`register listener for channel: ${eventName}`)
    }
    const channel = await this.#createChannel(eventName)
    await channel.consume(
      eventName,
      async (msg) => {
        if (msg === null) {
          return
        }
        if (once) {
          await channel.cancel(eventName)
        }
        const data = JSON.parse(String(msg.content)) as T
        this.#logger?.debug(`received event ${eventName}: ${String(data)}`)
        listener(data)
        return Promise.resolve()
      },
      { noAck: true, consumerTag: eventName },
    )
  }

  async on<T>(eventName: E, listener: (data: T) => void) {
    await this.#consumeQueue(eventName, listener)
  }

  async once<T>(eventName: E, listener: (data: T) => void) {
    await this.#consumeQueue(eventName, listener, true)
  }

  async off(eventName: E) {
    const channel = this.#registeredChannel[eventName]
    if (!channel) {
      return Promise.resolve()
    }
    delete this.#registeredChannel[eventName]
    try {
      this.#logger?.debug(`closing channel ${eventName}`)
      await channel.close()
    } catch (err) {
      const error = err as Error
      this.#logger?.warn(
        `Error while trying to close channel for event: ${eventName}: ${error.message}`,
      )
    }
  }

  async send(eventName: E, data?: unknown) {
    const channel = await this.#createChannel(eventName)
    this.#logger?.debug(`sending ${String(data)} to channel ${eventName}`)
    channel.sendToQueue(eventName, Buffer.from(JSON.stringify(data)))
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
    this.#connection = await amqp.connect(this.#url)
  }

  async stop() {
    await this.#closeRegisteredChannels()
    const connection = this.#connection
    if (connection) {
      await connection.close()
      this.#connection = undefined
    }
  }
}
