import type { BaseEventBusServiceBuilder } from '@main/domain/event-bus/base-event-bus.service.js'
import { EventEmitterBusService } from '@main/infra/event-bus/event-emitter/event-emitter-bus.service.js'
import type { Logger } from '@main/util/logger.js'
import type { Consumer, Kafka, LogEntry } from 'kafkajs'

export type KafkaEventBusServiceConfig = {
  brokers?: string[]
  clientId?: string
  logger?: Logger
  topicPrefix?: string
}

export enum LogLevel {
  ERROR = 1,
  WARN = 2,
  INFO = 4,
  DEBUG = 5,
}

export const ERROR_MESSAGE_NOT_INITIALIZED = 'Kafka is not initialized!'

export class KafkaEventBusService<
  E extends string = string,
> extends EventEmitterBusService<E> {
  static readonly DEFAULT_CLIENT_ID: 'app'
  static readonly DEFAULT_URL = 'localhost:9092'

  readonly #logger?: Logger
  #kafka: Kafka | null = null
  readonly #consumers: Map<E, Consumer> = new Map()
  readonly #kafkaConfig: Omit<KafkaEventBusServiceConfig, 'logger'>
  readonly #logCreator: (logLevel: number) => (entry: LogEntry) => void

  constructor(config: KafkaEventBusServiceConfig) {
    super(config)
    this.#logger = config.logger
    this.#kafkaConfig = { ...config }
    this.#logCreator = (logLevel: number) => (entry) => {
      const message = `kafka - ${entry.log.message}`
      switch (logLevel) {
        case LogLevel.ERROR:
          this.#logger?.error(message)
          break
        case LogLevel.WARN:
          this.#logger?.warn(message)
          break
        case LogLevel.INFO:
          this.#logger?.info(message)
          break
        case LogLevel.DEBUG:
          this.#logger?.debug(message)
          break
        default:
      }
    }
  }

  async #createTopic(eventName: E) {
    const kafka = this.#kafka
    if (!kafka) {
      throw new Error(ERROR_MESSAGE_NOT_INITIALIZED)
    }
    const admin = kafka.admin()
    await admin.connect()
    await admin.createTopics({
      topics: [
        {
          topic: eventName,
          numPartitions: 1,
          replicationFactor: 1,
        },
      ],
    })
    await admin.disconnect()
  }

  async #consume<T>(eventName: E, listener: (data: T) => void, once = false) {
    const kafka = this.#kafka
    if (!kafka) {
      throw new Error(ERROR_MESSAGE_NOT_INITIALIZED)
    }
    await this.#createTopic(eventName)
    const consumer = kafka.consumer({
      groupId: eventName,
      allowAutoTopicCreation: true,
    })
    await consumer.connect()
    this.#consumers.set(eventName, consumer)
    await consumer.subscribe({
      topic: this.getTopic(eventName),
      fromBeginning: true,
    })
    await consumer.run({
      eachMessage: async ({ message }) => {
        if (once) {
          this.off(eventName)
        }
        const value = message.value?.toString()
        const data = value ? JSON.parse(value) : undefined
        listener(data)
      },
    })
  }

  async #produce(eventName: E, data?: unknown) {
    const kafka = this.#kafka
    if (!kafka) {
      throw new Error(ERROR_MESSAGE_NOT_INITIALIZED)
    }
    await this.#createTopic(eventName)
    const producer = kafka.producer({ allowAutoTopicCreation: true })
    await producer.connect()
    try {
      await producer.send({
        topic: this.getTopic(eventName),
        messages: [{ value: JSON.stringify(data) }],
      })
    } finally {
      await producer.disconnect()
    }
  }

  async #stopConsumer(consumer: Consumer) {
    await consumer.stop()
    await consumer.disconnect()
  }

  getTopic(eventName: E): string {
    return this.#kafkaConfig.topicPrefix
      ? `${this.#kafkaConfig.topicPrefix}-${eventName}`
      : `${eventName}`
  }

  on<T>(eventName: E, listener: (data: T) => void) {
    this.#logger?.debug(`register listener for topic: ${eventName}`)
    void this.#consume(eventName, listener)
  }

  once<T>(eventName: E, listener: (data: T) => void) {
    this.#logger?.debug(`register once listener for channel: ${eventName}`)
    void this.#consume(eventName, listener, true)
  }

  off(eventName: E) {
    const consumer = this.#consumers.get(eventName)
    if (!consumer) {
      return
    }
    this.#logger?.debug(`unregister listener for topic: ${eventName}`)
    this.#consumers.delete(eventName)
    void this.#stopConsumer(consumer)
  }

  send(eventName: E, data?: unknown) {
    this.#logger?.debug(`sending ${String(data)} to topic ${eventName}`)
    void this.#produce(eventName, data)
  }

  async start() {
    const { Kafka } = await import('kafkajs')
    this.#kafka = new Kafka({
      logCreator: this.#logCreator,
      brokers: this.#kafkaConfig.brokers ?? [KafkaEventBusService.DEFAULT_URL],
      clientId:
        this.#kafkaConfig.clientId ?? KafkaEventBusService.DEFAULT_CLIENT_ID,
    })
  }

  async stop() {
    await Promise.all(
      this.#consumers.keys().map((eventName) => {
        this.off(eventName)
      }),
    )
  }
}

export type KafkaEventBusServiceBuilder = BaseEventBusServiceBuilder<
  KafkaEventBusServiceConfig,
  KafkaEventBusService
>

export const createKafkaEventBusService: KafkaEventBusServiceBuilder = (
  config,
) => new KafkaEventBusService(config)
