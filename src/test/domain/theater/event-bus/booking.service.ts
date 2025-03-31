import type { Logger } from '@main/util/logger.js'
import type TheaterEventBusService from '@test/domain/theater/event-bus/theater-event-bus.service.js'
import TheaterEventName from '@test/domain/theater/event-bus/theater-event-name.js'

export default class BookingService {
  readonly #eventBus: TheaterEventBusService
  readonly #logger: Logger

  constructor(logger: Logger, eventBus: TheaterEventBusService) {
    this.#logger = logger
    this.#eventBus = eventBus
  }

  async requestBooking(numberOfSeats: number): Promise<void> {
    this.#logger.info(`booking requested with ${numberOfSeats} seats!`)
    await this.#eventBus.sendAndWait(
      TheaterEventName.RESERVE_INVENTORY,
      TheaterEventName.INVENTORY_RESERVED,
      TheaterEventName.RESERVE_INVENTORY_ERROR,
      numberOfSeats,
    )
    await this.#eventBus.sendAndWait(
      TheaterEventName.PRINT_TICKET,
      TheaterEventName.TICKET_PRINTED,
      TheaterEventName.PRINT_TICKET_ERROR,
      numberOfSeats,
    )
  }
}
