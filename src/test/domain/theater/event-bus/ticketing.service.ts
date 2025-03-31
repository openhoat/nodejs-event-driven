import type { Logger } from '@main/util/logger.js'
import type { Service } from '@main/util/service.js'
import type TheaterEventBusService from '@test/domain/theater/event-bus/theater-event-bus.service.js'
import TheaterEventName from '@test/domain/theater/event-bus/theater-event-name.js'

export default class TicketingService implements Service {
  readonly #eventBus: TheaterEventBusService
  readonly #logger: Logger
  readonly #printTicketEventlistener: (numberOfSeats: number) => void

  constructor(logger: Logger, eventBus: TheaterEventBusService) {
    this.#logger = logger
    this.#eventBus = eventBus
    this.#printTicketEventlistener = (numberOfSeats: number) => {
      this.printTicket(numberOfSeats)
    }
  }

  printTicket(numberOfSeats: number) {
    this.#logger.info(`ticket printed with ${numberOfSeats} seats!`)
    this.#eventBus.send(TheaterEventName.TICKET_PRINTED, numberOfSeats)
  }

  async start() {
    this.#eventBus.on(
      TheaterEventName.PRINT_TICKET,
      this.#printTicketEventlistener,
    )
    return Promise.resolve()
  }

  async stop() {
    this.#eventBus.off(
      TheaterEventName.PRINT_TICKET,
      this.#printTicketEventlistener,
    )
    return Promise.resolve()
  }
}
