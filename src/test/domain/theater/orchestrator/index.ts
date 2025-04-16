import Orchestrator from '@test/domain/theater/orchestrator/orchestrator.js'
import { getLogger } from '@test/logger.js'
import BookingService from './booking.service.js'
import InventoryService from './inventory.service.js'
import NotificationService from './notification.service.js'
import TicketingService from './ticketing.service.js'

const availableSeats = 4
const requestedSeats = 4

const run = () => {
  const logger = getLogger()
  const inventoryService = new InventoryService(logger, availableSeats)
  const ticketingService = new TicketingService(logger)
  const notificationService = new NotificationService(logger)
  const orchestrator = new Orchestrator(
    inventoryService,
    ticketingService,
    notificationService,
  )
  const bookingService = new BookingService(logger, orchestrator)
  bookingService.requestBooking(requestedSeats)
  // Expecting no more seats
  try {
    bookingService.requestBooking(1)
  } catch (err) {
    const error = err as Error
    logger.error(error.message)
  }
}

run()
