import type { Logger } from '@main/util/logger.js'
import type Orchestrator from './orchestrator.js'

export default class BookingService {
  readonly #logger: Logger
  readonly #orchestrator: Orchestrator

  constructor(logger: Logger, orchestrator: Orchestrator) {
    this.#logger = logger
    this.#orchestrator = orchestrator
  }

  requestBooking(numberOfSeats: number) {
    this.#logger.info(`booking requested with ${numberOfSeats} seats!`)
    this.#orchestrator.run(numberOfSeats)
  }
}
