import {
  type PinoLoggerConfig,
  pinoLogger,
} from '@test/infra/logger/pino/pino-logger.js'

export const getLogger = (options?: {
  logLevel?: 'silent' | 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace'
}) => {
  const pinoConfig: PinoLoggerConfig = {
    transport: {
      target: 'pino-pretty',
    },
  }
  if (options?.logLevel) {
    pinoConfig.level = options.logLevel
  }
  return pinoLogger(pinoConfig)
}
