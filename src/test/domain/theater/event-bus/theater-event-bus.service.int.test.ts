import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from '@jest/globals'
import type { Logger } from '@main/util/logger.js'
import BookingService from '@test/domain/theater/event-bus/booking.service.js'
import InventoryService from '@test/domain/theater/event-bus/inventory.service.js'
import TheaterEventBusService from '@test/domain/theater/event-bus/theater-event-bus.service.js'
import TheaterEventName from '@test/domain/theater/event-bus/theater-event-name.js'
import TicketingService from '@test/domain/theater/event-bus/ticketing.service.js'
import { pinoLogger } from '@test/infra/logger/pino/pino-logger.js'
import pretty from 'pino-pretty'

describe('integration testss', () => {
  describe('theater event bus service', () => {
    const sentEvents: { name: TheaterEventName; data: unknown }[] = []
    let bookingService: BookingService
    let bus: TheaterEventBusService
    let inventoryService: InventoryService
    let logger: Logger
    let ticketingService: TicketingService
    beforeAll(async () => {
      logger = pinoLogger(pretty({ sync: true, minimumLevel: 'fatal' }))
      bus = new TheaterEventBusService({
        logger,
        type: 'memory',
      })
      await bus.start()
      const eventNamesToListen = [
        TheaterEventName.RESERVE_INVENTORY,
        TheaterEventName.INVENTORY_RESERVED,
        TheaterEventName.RESERVE_INVENTORY_ERROR,
        TheaterEventName.PRINT_TICKET,
        TheaterEventName.TICKET_PRINTED,
        TheaterEventName.PRINT_TICKET_ERROR,
      ]
      for (const name of eventNamesToListen) {
        bus.on(name, (data) => {
          sentEvents.push({ name, data })
        })
      }
      bookingService = new BookingService(logger, bus)
      ticketingService = new TicketingService(logger, bus)
      await ticketingService.start()
    })
    beforeEach(() => {
      sentEvents.length = 0
    })
    afterEach(async () => {
      await inventoryService.stop()
    })
    afterAll(async () => {
      await ticketingService.stop()
      await bus.stop()
    })
    test('should resolve given a booking request of 16 seats and an inventory of 20 available seats', async () => {
      // Given
      const availableSeats = 20
      const requestedSeats = 16
      inventoryService = new InventoryService(logger, availableSeats, bus)
      await inventoryService.start()
      // When
      await bookingService.requestBooking(requestedSeats)
      // Then
      expect(sentEvents).toStrictEqual([
        {
          name: 'RESERVE_INVENTORY',
          data: 16,
        },
        {
          name: 'INVENTORY_RESERVED',
          data: 4,
        },
        {
          name: 'PRINT_TICKET',
          data: 16,
        },
        {
          name: 'TICKET_PRINTED',
          data: 16,
        },
      ])
    })
    test('should reject given a booking request of 5 seats and an inventory of 4 available seats', async () => {
      // Given
      const availableSeats = 4
      const requestedSeats = 5
      inventoryService = new InventoryService(logger, availableSeats, bus)
      await inventoryService.start()
      const expectedErrorMessage = 'No more seats available'
      const expectedError = new Error(expectedErrorMessage)
      // When
      const promise = bookingService.requestBooking(requestedSeats)
      // Then
      await expect(promise).rejects.toStrictEqual(expectedError)
      expect(sentEvents).toStrictEqual([
        {
          name: 'RESERVE_INVENTORY',
          data: requestedSeats,
        },
        {
          name: 'RESERVE_INVENTORY_ERROR',
          data: expectedErrorMessage,
        },
      ])
    })
  })
})
