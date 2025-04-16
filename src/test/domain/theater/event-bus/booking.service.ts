import type { Logger } from '@main/util/logger.js'
import type TheaterEventBusService from '@test/domain/theater/event-bus/theater-event-bus.service.js'
import TheaterEventName from '@test/domain/theater/event-bus/theater-event-name.js'

export default class BookingService {
  readonly #bus: TheaterEventBusService
  readonly #logger: Logger

  constructor(logger: Logger, bus: TheaterEventBusService) {
    this.#logger = logger
    this.#bus = bus
  }

  async requestBooking(numberOfSeats: number): Promise<void> {
    this.#logger.info(`booking requested with ${numberOfSeats} seats!`)
    await this.#bus.sendAndWait(
      TheaterEventName.RESERVE_INVENTORY,
      TheaterEventName.INVENTORY_RESERVED,
      TheaterEventName.RESERVE_INVENTORY_ERROR,
      numberOfSeats,
    )
    await this.#bus.sendAndWait(
      TheaterEventName.PRINT_TICKET,
      TheaterEventName.TICKET_PRINTED,
      TheaterEventName.PRINT_TICKET_ERROR,
      numberOfSeats,
    )
  }
}
