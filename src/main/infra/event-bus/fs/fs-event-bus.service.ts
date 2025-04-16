import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import type { BaseEventBusServiceBuilder } from '@main/domain/event-bus/base-event-bus.service.js'
import { EventEmitterBusService } from '@main/infra/event-bus/event-emitter/event-emitter-bus.service.js'
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

export class FsEventBusService<
  E extends string = string,
> extends EventEmitterBusService<E> {
  static readonly defaultDataRootDir = join(tmpdir(), 'fs-event-bus')

  #abortController: AbortController | null = null
  readonly #dataRootDir: string
  readonly #pollingDelayMs?: number

  constructor(config: FsEventBusServiceConfig) {
    super(config)
    this.#pollingDelayMs = config.eventBusFsPollingDelayMs
    this.#dataRootDir =
      config.eventBusFsBaseDataDir ?? FsEventBusService.defaultDataRootDir
  }

  send(eventName: E, data?: unknown) {
    this.logger?.debug(`sending event: ${eventName} with ${String(data)}`)
    const dataRootDir = this.#dataRootDir
    const eventFileBaseDir = join(dataRootDir, eventName)
    createDirSyncIfNeeded(eventFileBaseDir)
    const timestamp = process.hrtime.bigint()
    const eventFilePath = join(eventFileBaseDir, `event-${timestamp}.data`)
    void writeFile(eventFilePath, JSON.stringify(data), 'utf-8')
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
      logger: this.logger,
      fileType: 'json',
      filenamePattern: watchPattern,
      pollingDelayMs: this.#pollingDelayMs,
    }
    const watcher = await watchFiles(watchConfig)
    watcher.onFile((filePath, data) => {
      const eventName = basename(dirname(filePath))
      this.logger?.debug(`sending event: ${eventName} with ${String(data)}`)
      this.eventEmitter.emit(eventName, data)
    })
  }
}

export type FsEventBusServiceBuilder = BaseEventBusServiceBuilder<
  FsEventBusServiceConfig,
  FsEventBusService
>

export const createFsEventBusService: FsEventBusServiceBuilder = (config) =>
  new FsEventBusService(config)
