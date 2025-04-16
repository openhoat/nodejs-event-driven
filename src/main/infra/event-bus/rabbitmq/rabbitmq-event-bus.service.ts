import type { BaseEventBusServiceBuilder } from '@main/domain/event-bus/base-event-bus.service.js'
import { EventEmitterBusService } from '@main/infra/event-bus/event-emitter/event-emitter-bus.service.js'
import type { Logger } from '@main/util/logger.js'
import type { Channel, ChannelModel, ConsumeMessage } from 'amqplib'
import type { Options } from 'amqplib/properties.js'

export type RabbitmqEventBusServiceConfig = {
  logger?: Logger
  url?: string
}

export class RabbitmqEventBusService<
  E extends string = string,
> extends EventEmitterBusService<E> {
  static readonly DEFAULT_USERNAME: string = 'guest'
  static readonly DEFAULT_PASSWORD: string = 'guest'
  static readonly DEFAULT_URL =
    `amqp://${RabbitmqEventBusService.DEFAULT_USERNAME}:${RabbitmqEventBusService.DEFAULT_PASSWORD}@localhost:5672`

  readonly #logger?: Logger
  #connection: ChannelModel | null = null
  readonly #registeredChannel: Record<E, Channel> = {} as Record<E, Channel>
  readonly #url: string

  constructor(config: RabbitmqEventBusServiceConfig) {
    super(config)
    this.#url = config.url ?? RabbitmqEventBusService.DEFAULT_URL
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
        this.off(eventName)
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
    once = false,
  ) {
    if (once) {
      this.#logger?.debug(`register once listener for channel: ${eventName}`)
    } else {
      this.#logger?.debug(`register listener for channel: ${eventName}`)
    }
    try {
      const channel = await this.#createChannel(eventName)
      const consumeMsg = async (msg: ConsumeMessage) => {
        if (once) {
          await channel.cancel(eventName)
        }
        const data = JSON.parse(String(msg.content)) as T
        this.#logger?.debug(`received event ${eventName}: ${String(data)}`)
        listener(data)
        return Promise.resolve()
      }
      await channel.consume(
        eventName,
        (msg) => {
          if (msg === null) {
            return
          }
          void consumeMsg(msg)
        },
        { noAck: true, consumerTag: eventName },
      )
    } catch (err) {
      this.errorListener?.(err)
    }
  }

  on<T>(eventName: E, listener: (data: T) => void) {
    void this.#consumeQueue(eventName, listener)
  }

  once<T>(eventName: E, listener: (data: T) => void) {
    void this.#consumeQueue(eventName, listener, true)
  }

  off(eventName: E) {
    const channel = this.#registeredChannel[eventName]
    if (!channel) {
      return
    }
    delete this.#registeredChannel[eventName]
    this.#logger?.debug(`closing channel ${eventName}`)
    void channel.close().catch((err) => {
      const error = err as Error
      this.#logger?.warn(
        `Error while trying to close channel for event: ${eventName}: ${error.message}`,
      )
      this.errorListener?.(err)
    })
  }

  send(eventName: E, data?: unknown) {
    void this.#createChannel(eventName).then((channel) => {
      this.#logger?.debug(`sending ${String(data)} to channel ${eventName}`)
      channel.sendToQueue(eventName, Buffer.from(JSON.stringify(data)))
    })
  }

  async start() {
    const {
      connect,
    }: {
      connect: (
        url: string | Options.Connect,
        socketOptions?: unknown,
      ) => Promise<ChannelModel>
    } = await import('amqplib')
    this.#connection = await connect(this.#url)
  }

  async stop() {
    await this.#closeRegisteredChannels()
    const connection = this.#connection
    if (connection) {
      await connection.close()
      this.#connection = null
    }
  }
}
export type RabbitmqEventBusServiceBuilder = BaseEventBusServiceBuilder<
  RabbitmqEventBusServiceConfig,
  RabbitmqEventBusService
>

export const createRabbitmqEventBusService: RabbitmqEventBusServiceBuilder = (
  config,
) => new RabbitmqEventBusService(config)
