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

export const relativePathIsFile = async (
  baseDir: string,
  fileRelPath: string,
  filenamePattern?: RegExp,
) => {
  const filePath = join(baseDir, fileRelPath)
  let filePathRelease: (() => Promise<void>) | null = null
  try {
    filePathRelease = await lock(filePath)
    const fileStat = await stat(filePath)
    if (!fileStat.isFile()) {
      return false
    }
    if (filenamePattern && !filenamePattern.test(fileRelPath)) {
      return false
    }
    return true
  } catch (err) {
    const error = err as Error & { code?: string }
    if (error.code !== 'ENOENT') {
      throw err
    }
    return false
  } finally {
    if (filePathRelease) {
      await filePathRelease()
    }
  }
}

export const listFilesInDirectory = async (
  baseDir: string,
  filenamePattern?: RegExp,
) => {
  const files: string[] = []
  let releaseBaseDir: (() => Promise<void>) | null = null
  try {
    releaseBaseDir = await lock(baseDir)
    const filePaths = await readdir(baseDir, { recursive: true })
    for (const fileRelPath of filePaths) {
      const filePath = join(baseDir, fileRelPath)
      const isFile = await relativePathIsFile(
        baseDir,
        fileRelPath,
        filenamePattern,
      )
      if (isFile) {
        files.push(filePath)
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
  let timer: NodeJS.Timeout | null = null
  if (signal) {
    signal.onabort = () => {
      if (logger) {
        logger.debug('Received signal abort: going to stop watching')
      }
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
    }
  }
  const pollFile = async (
    fileInfos: { timestamp: number; filePath: string; data: unknown }[],
    filePath: string,
  ) => {
    const timestampMatch = /event-(\d+)\.data$/.exec(filePath)
    if (!timestampMatch) {
      return Promise.resolve()
    }
    const timestamp = Number(timestampMatch[1])
    let filePathRelease: (() => Promise<void>) | null = null
    try {
      filePathRelease = await lock(filePath)
      const isJsonOrText = fileType === 'json' || fileType === 'text'
      const readFileOptions: {
        encoding?: BufferEncoding
      } = {}
      if (isJsonOrText) {
        readFileOptions.encoding = 'utf-8'
      }
      const content: Buffer | string = await readFile(filePath, readFileOptions)
      const isJson = fileType === 'json' && typeof content === 'string'
      let data: unknown
      if (isJson) {
        data = JSON.parse(content)
      } else {
        data = content
      }
      fileInfos.push({ timestamp, filePath, data })
      await unlink(filePath)
    } finally {
      if (filePathRelease) {
        await filePathRelease()
      }
    }
    return Promise.resolve()
  }

  const poll = async () => {
    const filePaths = await listFilesInDirectory(baseDir, filenamePattern)
    const fileInfos: { timestamp: number; filePath: string; data: unknown }[] =
      []
    for (const filePath of filePaths) {
      await pollFile(fileInfos, filePath)
    }
    fileInfos.sort((a, b) => a.timestamp - b.timestamp)
    for (const { filePath, data } of fileInfos) {
      if (fileListener) {
        fileListener(filePath, data)
      }
    }
  }
  timer = setInterval(() => {
    void poll()
  }, pollingDelayMs)
  void poll()
  return {
    onFile: (listener: (name: string, data: unknown) => void) => {
      fileListener = listener
    },
  }
}
