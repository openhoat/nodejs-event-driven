import { pinoLogger } from '@test/infra/logger/pino/pino-logger.js'
import pretty from 'pino-pretty'

export const getTestLogger = () =>
  pinoLogger(pretty({ sync: true, minimumLevel: 'fatal' }))
