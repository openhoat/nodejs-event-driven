import { expect } from '@jest/globals'
import type { BaseEventBusService } from '@main/domain/event-bus/base-event-bus.service.js'

export const testEventBus = async (bus: BaseEventBusService) => {
  // Given
  await bus.start()
  type Event = { name: string; data: unknown }
  const eventsToSend: Event[] = [
    {
      name: 'foo',
      data: 'bar',
    },
    {
      name: 'hello',
      data: 'world!',
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
        bus.once(name, eventHandlers[index])
      } else {
        bus.on(name, eventHandlers[index])
      }
    }
  })
  // When
  for (const { name, data } of eventsToSend) {
    bus.send(name, data)
  }
  await promise
  // Then
  expect(receivedEvents).toHaveLength(2)
  expect(receivedEvents).toContainEqual({
    data: 'bar',
    name: 'foo',
  })
  expect(receivedEvents).toContainEqual({
    data: 'world!',
    name: 'hello',
  })
  for (const [index, { name }] of eventsToSend.entries()) {
    bus.off(name, eventHandlers[index])
  }
}
