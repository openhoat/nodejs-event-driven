import type { BaseEventBusService } from '@main/domain/event-bus/base-event-bus.service.js'
import type { Logger } from '@main/util/logger.js'
import type { Service } from '@main/util/service.js'
import TheaterEventName from '@test/domain/theater/event-bus/theater-event-name.js'

export default class InventoryService implements Service {
  #availableSeats: number
  readonly #bus: BaseEventBusService
  readonly #logger: Logger
  readonly #reserveInventoryListener: (numberOfSeats: number) => void

  constructor(
    logger: Logger,
    availableSeats: number,
    bus: BaseEventBusService,
  ) {
    this.#logger = logger
    this.#availableSeats = availableSeats
    this.#bus = bus
    this.#reserveInventoryListener = (numberOfSeats: number) => {
      this.reserveInventory(numberOfSeats)
    }
  }

  reserveInventory(numberOfSeats: number) {
    if (this.#availableSeats < numberOfSeats) {
      this.#bus.send(
        TheaterEventName.RESERVE_INVENTORY_NO_MORE_SEAT,
        'No more seats available',
      )
      this.#bus.send(
        TheaterEventName.RESERVE_INVENTORY_ERROR,
        'No more seats available',
      )
      return
    }
    this.#availableSeats -= numberOfSeats
    this.#logger.info(`inventory reserved with ${numberOfSeats} seats!`)
    this.#logger.info(`remaining capacity: ${this.#availableSeats}`)
    this.#bus.send(TheaterEventName.INVENTORY_RESERVED, this.#availableSeats)
  }

  async start() {
    this.#bus.on(
      TheaterEventName.RESERVE_INVENTORY,
      this.#reserveInventoryListener,
    )
    return Promise.resolve()
  }

  async stop() {
    this.#bus.off(
      TheaterEventName.RESERVE_INVENTORY,
      this.#reserveInventoryListener,
    )
    return Promise.resolve()
  }
}
