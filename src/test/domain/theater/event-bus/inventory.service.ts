import type { Logger } from '@main/util/logger.js'
import type { Service } from '@main/util/service.js'
import type TheaterEventBusService from '@test/domain/theater/event-bus/theater-event-bus.service.js'
import TheaterEventName from '@test/domain/theater/event-bus/theater-event-name.js'

export default class InventoryService implements Service {
  #availableSeats: number
  readonly #eventBus: TheaterEventBusService
  readonly #logger: Logger
  readonly #reserveInventoryListener: (numberOfSeats: number) => void

  constructor(
    logger: Logger,
    availableSeats: number,
    eventBus: TheaterEventBusService,
  ) {
    this.#logger = logger
    this.#availableSeats = availableSeats
    this.#eventBus = eventBus
    this.#reserveInventoryListener = (numberOfSeats: number) => {
      this.reserveInventory(numberOfSeats)
    }
  }

  reserveInventory(numberOfSeats: number) {
    if (this.#availableSeats < numberOfSeats) {
      this.#eventBus.send(
        TheaterEventName.RESERVE_INVENTORY_NO_MORE_SEAT,
        'No more seats available',
      )
      this.#eventBus.send(
        TheaterEventName.RESERVE_INVENTORY_ERROR,
        'No more seats available',
      )
      return
    }
    this.#availableSeats -= numberOfSeats
    this.#logger.info(`inventory reserved with ${numberOfSeats} seats!`)
    this.#logger.info(`remaining capacity: ${this.#availableSeats}`)
    this.#eventBus.send(
      TheaterEventName.INVENTORY_RESERVED,
      this.#availableSeats,
    )
  }

  async start() {
    this.#eventBus.on(
      TheaterEventName.RESERVE_INVENTORY,
      this.#reserveInventoryListener,
    )
    return Promise.resolve()
  }

  async stop() {
    this.#eventBus.off(
      TheaterEventName.RESERVE_INVENTORY,
      this.#reserveInventoryListener,
    )
    return Promise.resolve()
  }
}
