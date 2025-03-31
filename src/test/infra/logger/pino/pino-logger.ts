import type { Logger } from '@main/util/logger.js'
import { type DestinationStream, type LoggerOptions, pino } from 'pino'

export type PinoLoggerConfig = LoggerOptions | DestinationStream

export const pinoLogger: (options?: PinoLoggerConfig) => Logger = (config) =>
  pino(config)
