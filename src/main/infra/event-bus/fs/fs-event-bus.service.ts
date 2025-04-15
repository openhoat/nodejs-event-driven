import { EventEmitter } from 'node:events'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { BaseEventBusService } from '@main/base-event-bus.service.js'
import {
  type FileWatcherConfig,
  createDirIfNeeded,
  createDirSyncIfNeeded,
  watchFiles,
} from '@main/util/fs.helper.js'
import type { Logger } from '@main/util/logger.js'

export type FsEventBusServiceConfig = {
  logger?: Logger
  eventBusFsBaseDataDir?: string
  eventBusFsPollingDelayMs?: number
}

export default class FsEventBusService<
  E extends string = string,
> extends BaseEventBusService<E> {
  static readonly defaultDataRootDir = join(tmpdir(), 'fs-event-bus')

  #abortController: AbortController | null = null
  readonly #dataRootDir: string
  readonly #eventEmitter: EventEmitter
  readonly #logger?: Logger
  readonly #pollingDelayMs?: number

  constructor(config: FsEventBusServiceConfig) {
    super()
    this.#logger = config.logger
    this.#pollingDelayMs = config.eventBusFsPollingDelayMs
    this.#eventEmitter = new EventEmitter()
    this.#dataRootDir =
      config.eventBusFsBaseDataDir ?? FsEventBusService.defaultDataRootDir
  }

  on<T>(eventName: E, listener: (data: T) => void) {
    this.#logger?.debug(`register listener for event: ${eventName}`)
    this.#eventEmitter.on(eventName, listener)
  }

  once<T>(eventName: E, listener: (data: T) => void) {
    this.#logger?.debug(`register once listener for event: ${eventName}`)
    this.#eventEmitter.once(eventName, listener)
  }

  off<T>(eventName: E, listener: (data: T) => void) {
    this.#logger?.debug(`unregister listener for event: ${eventName}`)
    this.#eventEmitter.off(eventName, listener)
  }

  send(eventName: E, data?: unknown) {
    this.#logger?.debug(`sending event: ${eventName} with ${String(data)}`)
    const dataRootDir = this.#dataRootDir
    const eventFileBaseDir = join(dataRootDir, eventName)
    createDirSyncIfNeeded(eventFileBaseDir)
    const timestamp = process.hrtime.bigint()
    const eventFilePath = join(eventFileBaseDir, `event-${timestamp}.data`)
    void writeFile(eventFilePath, JSON.stringify(data), 'utf-8')
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
    const abortController = new AbortController()
    this.#abortController = abortController
    await this.#watch(abortController)
  }

  stop() {
    const abortController = this.#abortController
    if (!abortController) {
      return Promise.resolve()
    }
    abortController.abort()
    this.#abortController = null
    return Promise.resolve()
  }

  async #watch(abortController: AbortController) {
    const dataRootDir = this.#dataRootDir
    await createDirIfNeeded(dataRootDir)
    const { signal } = abortController
    const watchPattern = /event-(\d+)\.data$/
    const watchConfig: FileWatcherConfig = {
      signal,
      baseDir: dataRootDir,
      logger: this.#logger,
      fileType: 'json',
      filenamePattern: watchPattern,
      pollingDelayMs: this.#pollingDelayMs,
    }
    const watcher = await watchFiles(watchConfig)
    watcher.onFile((filePath, data) => {
      const eventName = basename(dirname(filePath))
      this.#logger?.debug(`sending event: ${eventName} with ${String(data)}`)
      this.#eventEmitter.emit(eventName, data)
    })
  }
}
