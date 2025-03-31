import type { Logger } from '@main/util/logger.js'
import type InventoryService from './inventory.service.js'
import type NotificationService from './notification.service.js'
import type TicketingService from './ticketing.service.js'

export default class BookingService {
  readonly #logger: Logger
  readonly #inventoryService: InventoryService
  readonly #ticketingService: TicketingService
  readonly #notificationService: NotificationService

  constructor(
    logger: Logger,
    inventoryService: InventoryService,
    ticketingService: TicketingService,
    notificationService: NotificationService,
  ) {
    this.#logger = logger
    this.#inventoryService = inventoryService
    this.#ticketingService = ticketingService
    this.#notificationService = notificationService
  }

  requestBooking(numberOfSeats: number) {
    this.#logger.info(`booking requested with ${numberOfSeats} seats!`)
    try {
      this.#inventoryService.reserveInventory(numberOfSeats)
    } catch (err) {
      const error = err as Error & { code?: string }
      if (error.code === 'NO_MORE_SEAT') {
        this.#notificationService.notifyNoMoreSeats()
        return
      }
      throw err
    }
    this.#ticketingService.printTicket(numberOfSeats)
  }
}
