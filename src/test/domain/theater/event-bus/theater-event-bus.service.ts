import { EventBusService } from '@main/event-bus.service.js'
import type TheaterEventName from '@test/domain/theater/event-bus/theater-event-name.js'

export default class TheaterEventBusService extends EventBusService<TheaterEventName> {}
