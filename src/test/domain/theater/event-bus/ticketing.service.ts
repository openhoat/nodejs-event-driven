import type { BaseEventBusService } from '@main/domain/event-bus/base-event-bus.service.js'
import type { Logger } from '@main/util/logger.js'
import type { Service } from '@main/util/service.js'
import TheaterEventName from '@test/domain/theater/event-bus/theater-event-name.js'

export default class TicketingService implements Service {
  readonly #bus: BaseEventBusService
  readonly #logger: Logger
  readonly #printTicketEventlistener: (numberOfSeats: number) => void

  constructor(logger: Logger, bus: BaseEventBusService) {
    this.#logger = logger
    this.#bus = bus
    this.#printTicketEventlistener = (numberOfSeats: number) => {
      this.printTicket(numberOfSeats)
    }
  }

  printTicket(numberOfSeats: number) {
    this.#logger.info(`ticket printed with ${numberOfSeats} seats!`)
    this.#bus.send(TheaterEventName.TICKET_PRINTED, numberOfSeats)
  }

  async start() {
    this.#bus.on(TheaterEventName.PRINT_TICKET, this.#printTicketEventlistener)
    return Promise.resolve()
  }

  async stop() {
    this.#bus.off(TheaterEventName.PRINT_TICKET, this.#printTicketEventlistener)
    return Promise.resolve()
  }
}
