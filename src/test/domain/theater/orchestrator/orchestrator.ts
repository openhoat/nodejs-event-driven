import type InventoryService from './inventory.service.js'
import type NotificationService from './notification.service.js'
import type TicketingService from './ticketing.service.js'

export default class Orchestrator {
  readonly #inventoryService: InventoryService
  readonly #ticketingService: TicketingService
  readonly #notificationService: NotificationService

  constructor(
    inventoryService: InventoryService,
    ticketingService: TicketingService,
    notificationService: NotificationService,
  ) {
    this.#inventoryService = inventoryService
    this.#ticketingService = ticketingService
    this.#notificationService = notificationService
  }

  run(numberOfSeats: number) {
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
