import { createEventBusService } from '@main/event-bus.service.js'
import { getLogger } from '@test/logger.js'
import BookingService from './booking.service.js'
import InventoryService from './inventory.service.js'
import NotificationService from './notification.service.js'
import TicketingService from './ticketing.service.js'

const availableSeats = 4
const requestedSeats = 4

const run = async () => {
  const logger = getLogger()
  const bus = createEventBusService({
    type: 'memory',
    logger,
  })
  const inventoryService = new InventoryService(logger, availableSeats, bus)
  const ticketingService = new TicketingService(logger, bus)
  const notificationService = new NotificationService(logger, bus)
  const bookingService = new BookingService(logger, bus)
  try {
    await inventoryService.start()
    await ticketingService.start()
    await notificationService.start()
    await bookingService.requestBooking(requestedSeats)
    // Expecting no more seats
    await bookingService.requestBooking(1)
  } finally {
    await notificationService.stop()
    await ticketingService.stop()
    await inventoryService.stop()
  }
}

void run()
