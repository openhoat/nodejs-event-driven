import type { Service } from '@main/util/service.js'

export abstract class BaseEventBusService<E extends string = string>
  implements Service
{
  abstract send(eventName: E, data?: unknown): void

  abstract on<T>(eventName: E, listener: (data: T) => void): void

  abstract once<T>(eventName: E, listener: (data: T) => void): void

  abstract off<T>(eventName: E, listener: (data: T) => void): void

  sendAndWait<T>(
    sendEventName: E,
    successEventName: E,
    errorEventName: E,
    data?: unknown,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const successListener = (data: T) => {
        this.off(errorEventName, errorListener)
        resolve(data)
      }
      const errorListener = (errorMessage: string) => {
        this.off(successEventName, successListener)
        reject(new Error(errorMessage))
      }
      this.once(successEventName, successListener)
      this.once(errorEventName, errorListener)
      this.send(sendEventName, data)
    })
  }
  abstract start(): Promise<void>
  abstract stop(): Promise<void>
}
