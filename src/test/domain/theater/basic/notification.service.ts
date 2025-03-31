import type { Logger } from '@main/util/logger.js'

export default class NotificationService {
  readonly #logger: Logger

  constructor(logger: Logger) {
    this.#logger = logger
  }

  notifyNoMoreSeats() {
    this.#logger.warn('Notification: no more seat available!')
  }
}
