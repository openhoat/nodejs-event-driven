import { mkdirSync, statSync } from 'node:fs'
import { mkdir, readFile, readdir, stat, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { setInterval } from 'node:timers'
import type { Logger } from '@main/util/logger.js'
import { lock } from 'proper-lockfile'

export const checkIsDir = async (filePath: string) => {
  const filePathStats = await stat(filePath)
  if (!filePathStats.isDirectory()) {
    throw new Error(`File ${filePath} is not a directory`)
  }
}

export const checkIsDirSync = (filePath: string) => {
  const filePathStats = statSync(filePath)
  if (!filePathStats.isDirectory()) {
    throw new Error(`File ${filePath} is not a directory`)
  }
}

export const createDirIfNeeded = async (filePath: string) => {
  try {
    await checkIsDir(filePath)
  } catch (err) {
    const error = err as { code?: string }
    if (error.code === 'ENOENT') {
      await mkdir(filePath, { recursive: true })
      return
    }
    throw error
  }
}

export const createDirSyncIfNeeded = (filePath: string) => {
  try {
    checkIsDirSync(filePath)
  } catch (err) {
    const error = err as { code?: string }
    if (error.code === 'ENOENT') {
      mkdirSync(filePath, { recursive: true })
      return
    }
    throw error
  }
}

export const listFilesInDirectory = async (
  baseDir: string,
  filenamePattern?: RegExp,
) => {
  const files: string[] = []
  let releaseBaseDir: (() => Promise<void>) | undefined = undefined
  try {
    releaseBaseDir = await lock(baseDir)
    const filePaths = await readdir(baseDir, { recursive: true })
    for (const fileRelPath of filePaths) {
      const filePath = join(baseDir, fileRelPath)
      let filePathRelease: (() => Promise<void>) | undefined = undefined
      try {
        filePathRelease = await lock(filePath)
        const fileStat = await stat(filePath)
        if (!fileStat.isFile()) {
          continue
        }
        if (filenamePattern && !filenamePattern.test(fileRelPath)) {
          continue
        }
        files.push(filePath)
      } catch (err) {
        const error = err as Error & { code?: string }
        if (error.code !== 'ENOENT') {
          throw err
        }
      } finally {
        if (filePathRelease) {
          await filePathRelease()
        }
      }
    }
  } catch (err) {
    const error = err as Error & { code?: string }
    if (error.code !== 'ELOCKED') {
      throw err
    }
  } finally {
    if (releaseBaseDir) {
      await releaseBaseDir()
    }
  }
  return files
}

export type FileWatcherConfig = {
  baseDir: string
  filenamePattern?: RegExp
  fileType?: 'json' | 'text'
  logger?: Logger
  pollingDelayMs?: number
  signal?: AbortSignal
}

export const watchFiles = async (config: FileWatcherConfig) => {
  const {
    baseDir,
    filenamePattern,
    fileType,
    logger,
    pollingDelayMs = 500,
    signal,
  } = config
  let fileListener: ((name: string, data: unknown) => void) | undefined
  let timer: NodeJS.Timeout | undefined = undefined
  if (signal) {
    signal.onabort = () => {
      if (logger) {
        logger.debug('Received signal abort: going to stop watching')
      }
      if (timer) {
        clearTimeout(timer)
        timer = undefined
      }
    }
  }
  const poll = async () => {
    const filePaths = await listFilesInDirectory(baseDir, filenamePattern)
    const fileInfos: { timestamp: number; filePath: string; data: unknown }[] =
      []
    for (const filePath of filePaths) {
      const timestampMatch = /event-(\d+)\.data$/.exec(filePath)
      if (!timestampMatch) {
        continue
      }
      const timestamp = Number(timestampMatch[1])
      let filePathRelease: (() => Promise<void>) | undefined = undefined
      try {
        filePathRelease = await lock(filePath)
        const content: Buffer | string = await readFile(
          filePath,
          fileType === 'json' || fileType === 'text' ? 'utf-8' : undefined,
        )
        const data =
          fileType === 'json' && typeof content === 'string'
            ? JSON.parse(content)
            : content
        fileInfos.push({ timestamp, filePath, data })
        await unlink(filePath)
      } finally {
        if (filePathRelease) {
          await filePathRelease()
        }
      }
    }
    fileInfos.sort((a, b) => a.timestamp - b.timestamp)
    for (const { filePath, data } of fileInfos) {
      if (fileListener) {
        fileListener(filePath, data)
      }
    }
  }
  timer = setInterval(poll, pollingDelayMs)
  void poll()
  return {
    onFile: (listener: (name: string, data: unknown) => void) => {
      fileListener = listener
    },
  }
}
