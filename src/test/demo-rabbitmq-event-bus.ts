import { createRabbitmqEventBusService } from '@main/infra/event-bus/rabbitmq/rabbitmq-event-bus.service.js'
import { configSpec } from '@test/config.js'
import {
  type PinoLoggerConfig,
  pinoLogger,
} from '@test/infra/logger/pino/pino-logger.js'
import { buildConfig } from '@test/util/config-builder.js'

const config = buildConfig(configSpec)
const pinoConfig: PinoLoggerConfig = {
  transport: {
    target: 'pino-pretty',
  },
}
if (config.logLevel) {
  pinoConfig.level = config.logLevel
}
const logger = pinoLogger(pinoConfig)

const runConsumer = async () => {
  const bus = createRabbitmqEventBusService({ logger })
  await bus.start()
  bus.once('foo', async (data) => {
    console.log('consumer received data:', data)
    setTimeout(async () => {
      console.log('consumer closing…')
      await bus.stop()
    }, 1000)
  })
}

const runPublisher = async () => {
  const bus = createRabbitmqEventBusService({ logger })
  await bus.start()
  bus.send('foo', 'bar')
  setTimeout(async () => {
    console.log('publisher closing…')
    await bus.stop()
  }, 1000)
}

void runConsumer()
void runPublisher()
