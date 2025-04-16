import { fileURLToPath } from 'node:url'
import type { EventBusServiceConfig } from '@main/event-bus.service.js'
import type { Logger } from '@main/util/logger.js'
import { configSpec } from '@test/config.js'
import BookingService from '@test/domain/theater/event-bus/booking.service.js'
import InventoryService from '@test/domain/theater/event-bus/inventory.service.js'
import TheaterEventBusService from '@test/domain/theater/event-bus/theater-event-bus.service.js'
import TicketingService from '@test/domain/theater/event-bus/ticketing.service.js'
import {
  type PinoLoggerConfig,
  pinoLogger,
} from '@test/infra/logger/pino/pino-logger.js'
import { buildConfig } from '@test/util/config-builder.js'

const availableSeats = 20
const requestedSeats = 16

export const runTheaterDemo = async (
  bus: TheaterEventBusService,
  logger: Logger,
) => {
  const inventoryService = new InventoryService(logger, availableSeats, bus)
  const ticketingService = new TicketingService(logger, bus)
  const bookingService = new BookingService(logger, bus)
  try {
    await bus.start()
    await inventoryService.start()
    await ticketingService.start()
    await bookingService.requestBooking(requestedSeats)
    await bookingService.requestBooking(4)
    await bookingService.requestBooking(1)
  } catch (err) {
    const error = err as Error
    logger.error(`${error.message}`)
  } finally {
    await ticketingService.stop()
    await inventoryService.stop()
    await bus.stop()
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
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
  let eventBusConfig: EventBusServiceConfig
  if (config.eventBusType === 'fs') {
    eventBusConfig = {
      eventBusFsBaseDataDir: config.eventBusFsBaseDataDir,
      logger,
      eventBusFsPollingDelayMs: 3000,
      type: 'fs',
    }
  } else if (config.eventBusType === 'redis') {
    eventBusConfig = {
      logger,
      type: 'redis',
    }
  } else if (config.eventBusType === 'rabbitmq') {
    eventBusConfig = {
      logger,
      type: 'rabbitmq',
    }
  } else {
    eventBusConfig = {
      eventBusMemoryEmitDelay: config.eventBusMemoryEmitDelay,
      logger,
      type: 'memory',
    }
  }
  const bus = new TheaterEventBusService(eventBusConfig)
  void runTheaterDemo(bus, logger)
}
