import { EventEmitter } from 'node:events'
import type {
  BaseEventBusService,
  BaseEventBusServiceConfig,
  EventBusServiceErrorListener,
} from '@main/domain/event-bus/base-event-bus.service.js'
import type { Logger } from '@main/util/logger.js'

export abstract class EventEmitterBusService<E extends string = string>
  implements BaseEventBusService
{
  readonly #logger?: Logger
  readonly #eventEmitter: EventEmitter
  #errorListener: EventBusServiceErrorListener | null = null

  get logger(): Logger | undefined {
    return this.#logger
  }

  get eventEmitter(): EventEmitter {
    return this.#eventEmitter
  }

  get errorListener() {
    return this.#errorListener
  }

  constructor(config: BaseEventBusServiceConfig) {
    this.#logger = config.logger
    this.#eventEmitter = new EventEmitter()
  }

  abstract send(eventName: E, data?: unknown): void

  abstract start(): Promise<void>

  abstract stop(): Promise<void>

  on<T>(eventName: E, listener: (data: T) => void) {
    this.logger?.debug(`register listener for event: ${eventName}`)
    this.eventEmitter.on(eventName, listener)
  }

  onError(listener: (data: unknown) => void) {
    this.#errorListener = listener
  }

  once<T>(eventName: E, listener: (data: T) => void) {
    this.logger?.debug(`register once listener for event: ${eventName}`)
    this.eventEmitter.once(eventName, listener)
  }

  off<T>(eventName: E, listener: (data: T) => void) {
    this.logger?.debug(`unregister listener for event: ${eventName}`)
    this.eventEmitter.off(eventName, listener)
  }

  sendAndWait<T>(
    sendEventName: E,
    successEventName: E,
    errorEventName: E,
    data: unknown,
    options?: { timeout?: number },
  ): Promise<T> {
    const { timeout } = options ?? {}
    let timer: NodeJS.Timeout | null = null
    return new Promise((resolve, reject) => {
      const successListener = (successData: T) => {
        console.log('successData:', successData)
        if (timer) {
          clearTimeout(timer)
          timer = null
        }
        this.off(errorEventName, errorListener)
        resolve(successData)
      }
      const errorListener = (errorMessage: string) => {
        console.log('errorMessage:', errorMessage)
        if (timer) {
          clearTimeout(timer)
          timer = null
        }
        this.off(successEventName, successListener)
        reject(new Error(errorMessage))
      }
      if (timeout) {
        timer = setTimeout(() => {
          this.off(successEventName, successListener)
          this.off(errorEventName, errorListener)
          reject(new Error('Timeout expired!'))
        }, timeout)
      }
      this.once(successEventName, successListener)
      this.once(errorEventName, errorListener)
      this.send(sendEventName, data)
    })
  }

  waitFor<T>(eventName: E, options?: { timeout?: number }): Promise<T> {
    this.#logger?.debug(`waiting for event: ${eventName}`)
    const { timeout } = options ?? {}
    let timer: NodeJS.Timeout | null = null
    return new Promise((resolve, reject) => {
      const listener = (data: T) => {
        if (timer) {
          clearTimeout(timer)
        }
        resolve(data)
      }
      if (timeout) {
        timer = setTimeout(() => {
          this.eventEmitter.removeListener(eventName, listener)
          reject(new Error('Timeout expired!'))
        }, timeout)
      }
      this.once(eventName, listener)
    })
  }
}
