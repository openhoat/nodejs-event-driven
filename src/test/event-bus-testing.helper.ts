import { rm } from 'node:fs/promises'
import { expect } from '@jest/globals'
import type { BaseEventBusService } from '@main/domain/event-bus/base-event-bus.service.js'

export const cleanFs = async (dataRootDir: string) => {
  try {
    await rm(dataRootDir, { recursive: true, force: true })
  } catch (err) {
    console.warn(err)
  }
}

export const testSendingManyEvents = async (bus: BaseEventBusService) => {
  // Given
  type Event = { name: string; data: unknown }
  const prefix = `${Date.now()}`
  const eventsToSend: Event[] = [
    {
      name: `${prefix}-foo`,
      data: 'bar',
    },
    {
      name: `${prefix}-hello`,
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
  expect(receivedEvents).toHaveLength(eventsToSend.length)
  for (const eventToSend of eventsToSend) {
    expect(receivedEvents).toContainEqual(eventToSend)
  }
  for (const [index, { name }] of eventsToSend.entries()) {
    bus.off(name, eventHandlers[index])
  }
}
