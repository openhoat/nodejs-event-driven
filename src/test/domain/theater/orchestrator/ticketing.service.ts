import type { Logger } from '@main/util/logger.js'

export default class TicketingService {
  readonly #logger: Logger

  constructor(logger: Logger) {
    this.#logger = logger
  }

  printTicket(numberOfSeats: number) {
    this.#logger.info(`ticket printed with ${numberOfSeats} seats!`)
  }
}
