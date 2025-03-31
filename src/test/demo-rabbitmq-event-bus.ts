import RabbitmqEventBusService from '@main/infra/event-bus/rabbitmq/rabbitmq-event-bus.service.js'
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

const runConsumer = async () => {
  const eventBus = new RabbitmqEventBusService({ logger })
  await eventBus.start()
  await eventBus.once('foo', async (data) => {
    console.log('consumer received data:', data)
    setTimeout(async () => {
      console.log('consumer closing…')
      await eventBus.stop()
    }, 1000)
  })
}

const runPublisher = async () => {
  const eventBus = new RabbitmqEventBusService({ logger })
  await eventBus.start()
  await eventBus.send('foo', 'bar')
  setTimeout(async () => {
    console.log('publisher closing…')
    await eventBus.stop()
  }, 1000)
}

void runConsumer()
void runPublisher()
