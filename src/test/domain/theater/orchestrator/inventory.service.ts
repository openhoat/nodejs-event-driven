import type { Logger } from '@main/util/logger.js'

export default class InventoryService {
  #availableSeats: number
  readonly #logger: Logger

  constructor(logger: Logger, availableSeats: number) {
    this.#logger = logger
    this.#availableSeats = availableSeats
  }

  reserveInventory(numberOfSeats: number) {
    if (this.#availableSeats < numberOfSeats) {
      const error: Error & { code?: string } = new Error(
        'No more seats available',
      )
      error.code = 'NO_MORE_SEAT'
      throw error
    }
    this.#availableSeats -= numberOfSeats
    this.#logger.info(`inventory reserved with ${numberOfSeats} seats!`)
    this.#logger.info(`remaining capacity: ${this.#availableSeats}`)
  }
}
