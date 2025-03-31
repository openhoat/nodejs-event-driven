import config from '@test/config/index.js'
import {
  type PinoLoggerConfig,
  pinoLogger,
} from '@test/infra/logger/pino/pino-logger.js'

const pinoConfig: PinoLoggerConfig = {
  transport: {
    target: 'pino-pretty',
  },
}
if (config.logLevel) {
  pinoConfig.level = config.logLevel
}
const logger = pinoLogger(pinoConfig)

export default logger
