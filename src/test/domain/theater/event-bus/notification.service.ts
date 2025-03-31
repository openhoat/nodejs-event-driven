import type { Logger } from '@main/util/logger.js'
import type { Service } from '@main/util/service.js'
import type TheaterEventBusService from '@test/domain/theater/event-bus/theater-event-bus.service.js'
import TheaterEventName from '@test/domain/theater/event-bus/theater-event-name.js'

export default class NotificationService implements Service {
  readonly #eventBus: TheaterEventBusService
  readonly #logger: Logger
  readonly #notifyNoMoreSeatEventListener: () => void

  constructor(logger: Logger, eventBus: TheaterEventBusService) {
    this.#logger = logger
    this.#eventBus = eventBus
    this.#notifyNoMoreSeatEventListener = () => {
      this.notifyNoMoreSeat()
    }
  }

  notifyNoMoreSeat() {
    this.#logger.warn('Notification: no more seat available!')
  }

  async start() {
    this.#eventBus.on(
      TheaterEventName.RESERVE_INVENTORY_NO_MORE_SEAT,
      this.#notifyNoMoreSeatEventListener,
    )
    return Promise.resolve()
  }

  async stop() {
    this.#eventBus.off(
      TheaterEventName.RESERVE_INVENTORY_NO_MORE_SEAT,
      this.#notifyNoMoreSeatEventListener,
    )
    return Promise.resolve()
  }
}
