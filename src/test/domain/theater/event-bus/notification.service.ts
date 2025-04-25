import type { BaseEventBusService } from '@main/domain/event-bus/base-event-bus.service.js'
import type { Logger } from '@main/util/logger.js'
import type { Service } from '@main/util/service.js'
import TheaterEventName from '@test/domain/theater/event-bus/theater-event-name.js'

export default class NotificationService implements Service {
  readonly #bus: BaseEventBusService
  readonly #logger: Logger
  readonly #notifyNoMoreSeatEventListener: () => void

  constructor(logger: Logger, bus: BaseEventBusService) {
    this.#logger = logger
    this.#bus = bus
    this.#notifyNoMoreSeatEventListener = () => {
      this.notifyNoMoreSeat()
    }
  }

  notifyNoMoreSeat() {
    this.#logger.warn('Notification: no more seat available!')
  }

  async start() {
    this.#bus.on(
      TheaterEventName.RESERVE_INVENTORY_NO_MORE_SEAT,
      this.#notifyNoMoreSeatEventListener,
    )
    return Promise.resolve()
  }

  async stop() {
    this.#bus.off(
      TheaterEventName.RESERVE_INVENTORY_NO_MORE_SEAT,
      this.#notifyNoMoreSeatEventListener,
    )
    return Promise.resolve()
  }
}
