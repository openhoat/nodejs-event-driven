import { expect } from '@jest/globals'
import type { BaseEventBusService } from '@main/base-event-bus.service.js'
import { pinoLogger } from '@test/infra/logger/pino/pino-logger.js'
import pretty from 'pino-pretty'

export const getTestLogger = () =>
  pinoLogger(pretty({ sync: true, minimumLevel: 'fatal' }))

export const testEventBus = async (eventBus: BaseEventBusService) => {
  // Given
  await eventBus.start()
  type Event = { name: string; data: unknown }
  const eventsToSend: Event[] = [
    {
      name: 'foo',
      data: 'bar',
    },
    {
      name: 'hello',
      data: 'world',
    },
  ]
  const receivedEvents: Event[] = []
  const eventHandlers: ((data: unknown) => void)[] = []
  const promise = new Promise<void>((resolve) => {
    for (const [index, { name }] of eventsToSend.entries()) {
      const eventHandler = (data: unknown) => {
        receivedEvents.push({ name, data })
        if (receivedEvents.length >= eventsToSend.length) {
          resolve()
        }
      }
      eventHandlers.push(eventHandler)
      if (index === 0) {
        eventBus.once(name, eventHandlers[index])
      } else {
        eventBus.on(name, eventHandlers[index])
      }
    }
  })
  // When
  for (const { name, data } of eventsToSend) {
    eventBus.send(name, data)
  }
  await promise
  // Then
  expect(receivedEvents).toHaveLength(2)
  expect(receivedEvents).toContainEqual({
    data: 'bar',
    name: 'foo',
  })
  expect(receivedEvents).toContainEqual({
    data: 'world',
    name: 'hello',
  })
  for (const [index, { name }] of eventsToSend.entries()) {
    eventBus.off(name, eventHandlers[index])
  }
}
