import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals'
import type {
  BaseEventBusService,
  BaseEventBusServiceBuilder,
  BaseEventBusServiceConfig,
} from '@main/domain/event-bus/base-event-bus.service.js'
import { mockModule } from '@test/util/testing-helper.js'
import { getTestLogger } from '@test/util/testing-logger.js'
import type { RedisClientType } from 'redis'

describe('unit tests', () => {
  describe('infra', () => {
    describe('event-bus', () => {
      describe('redis', () => {
        const logger = getTestLogger()
        let fakeCreateClient: jest.Mocked<() => RedisClientType>
        let createRedisEventBusService: BaseEventBusServiceBuilder<BaseEventBusServiceConfig>
        let bus: BaseEventBusService
        const eventName = 'foo'
        let fakeClient: jest.Mocked<RedisClientType>
        beforeAll(async () => {
          fakeCreateClient = jest.fn()
          mockModule('redis', { createClient: fakeCreateClient })
          createRedisEventBusService = (
            await import(
              '@main/infra/event-bus/redis/redis-event-bus.service.js'
            )
          ).createRedisEventBusService
          const config: BaseEventBusServiceConfig = {
            logger,
          }
          bus = createRedisEventBusService(config)
          fakeClient = {
            connect: jest.fn(),
            close: jest.fn(),
            publish: jest.fn(),
            subscribe: jest.fn(),
            unsubscribe: jest.fn(),
            quit: jest.fn(),
          } as unknown as jest.Mocked<RedisClientType>
        })
        beforeEach(async () => {
          fakeCreateClient.mockReturnValue(fakeClient)
        })
        afterEach(async () => {
          jest.resetAllMocks()
        })
        afterAll(async () => {
          jest.restoreAllMocks()
        })
        describe('on', () => {
          afterEach(async () => {
            await bus.stop()
          })
          test('should listen to "foo" events given a message', async () => {
            // Given
            const listener = jest.fn()
            await bus.start()
            expect(fakeCreateClient).toHaveBeenCalledTimes(2)
            expect(fakeCreateClient).toHaveBeenNthCalledWith(1, {
              keyPrefix: 'events',
              logger,
            })
            expect(fakeCreateClient).toHaveBeenNthCalledWith(2, {
              keyPrefix: 'events',
              logger,
            })
            const fakeSubscribe: (
              channels: string,
              listener: (message: string, channel: string) => unknown,
            ) => Promise<void> = (channel, listener) => {
              listener(JSON.stringify('bar'), channel)
              return Promise.resolve()
            }
            // @ts-ignore
            fakeClient.subscribe.mockImplementation(fakeSubscribe)
            // When
            bus.on(eventName, listener)
            // Then
            expect(fakeClient.subscribe).toHaveBeenCalledTimes(1)
            expect(fakeClient.subscribe).toHaveBeenCalledWith(
              `events:${eventName}`,
              expect.any(Function),
            )
            await bus.stop()
            expect(fakeClient.quit).toHaveBeenCalledTimes(2)
            expect(fakeClient.quit).toHaveBeenNthCalledWith(1)
            expect(fakeClient.quit).toHaveBeenNthCalledWith(2)
          })
          test('should do nothing to listen given bus not started', async () => {
            // Given
            const listener = jest.fn()
            // When
            bus.on(eventName, listener)
            // Then
            expect(fakeClient.subscribe).not.toHaveBeenCalled()
          })
        })
        describe('once', () => {
          afterEach(async () => {
            await bus.stop()
          })
          test('should listen to "foo" events given a message', async () => {
            // Given
            const listener = jest.fn()
            await bus.start()
            expect(fakeCreateClient).toHaveBeenCalledTimes(2)
            expect(fakeCreateClient).toHaveBeenNthCalledWith(1, {
              keyPrefix: 'events',
              logger,
            })
            expect(fakeCreateClient).toHaveBeenNthCalledWith(2, {
              keyPrefix: 'events',
              logger,
            })
            const fakeSubscribe: (
              channels: string,
              listener: (message: string, channel: string) => unknown,
            ) => Promise<void> = (channel, listener) => {
              listener(JSON.stringify('bar'), channel)
              return Promise.resolve()
            }
            // @ts-ignore
            fakeClient.subscribe.mockImplementation(fakeSubscribe) // When
            bus.once(eventName, listener)
            // Then
            expect(fakeClient.subscribe).toHaveBeenCalledTimes(1)
            expect(fakeClient.subscribe).toHaveBeenCalledWith(
              `events:${eventName}`,
              expect.any(Function),
            )
          })
          test('should do nothing to listen given bus not started', async () => {
            // Given
            const listener = jest.fn()
            // When
            bus.once(eventName, listener)
            // Then
            expect(fakeClient.subscribe).not.toHaveBeenCalled()
          })
        })
        describe('off', () => {
          afterEach(async () => {
            await bus.stop()
          })
          test('should listen to "foo" events given a message', async () => {
            // Given
            const listener = jest.fn()
            await bus.start()
            expect(fakeCreateClient).toHaveBeenCalledTimes(2)
            expect(fakeCreateClient).toHaveBeenNthCalledWith(1, {
              keyPrefix: 'events',
              logger,
            })
            expect(fakeCreateClient).toHaveBeenNthCalledWith(2, {
              keyPrefix: 'events',
              logger,
            })
            // When
            bus.off(eventName, listener)
            // Then
            expect(fakeClient.unsubscribe).toHaveBeenCalledTimes(1)
            expect(fakeClient.unsubscribe).toHaveBeenCalledWith(
              `events:${eventName}`,
            )
          })
          test('should do nothing to listen given bus not started', async () => {
            // Given
            const listener = jest.fn()
            // When
            bus.off(eventName, listener)
            // Then
            expect(fakeClient.unsubscribe).not.toHaveBeenCalled()
          })
        })
        describe('send', () => {
          const eventValue = 'bar'
          afterEach(async () => {
            await bus.stop()
          })
          test('should send a "foo" event', async () => {
            // Given
            await bus.start()
            expect(fakeCreateClient).toHaveBeenCalledTimes(2)
            expect(fakeCreateClient).toHaveBeenNthCalledWith(1, {
              keyPrefix: 'events',
              logger,
            })
            expect(fakeCreateClient).toHaveBeenNthCalledWith(2, {
              keyPrefix: 'events',
              logger,
            })
            // When
            bus.send(eventName, eventValue)
            // Then
            expect(fakeClient.publish).toHaveBeenCalledTimes(1)
            expect(fakeClient.publish).toHaveBeenCalledWith(
              `events:${eventName}`,
              JSON.stringify(eventValue),
            )
            await bus.stop()
            expect(fakeClient.quit).toHaveBeenCalledTimes(2)
            expect(fakeClient.quit).toHaveBeenNthCalledWith(1)
            expect(fakeClient.quit).toHaveBeenNthCalledWith(2)
          })
          test('should do nothing to listen given bus not started', async () => {
            // Given
            const listener = jest.fn()
            // When
            bus.send(eventName, listener)
            // Then
            expect(fakeClient.subscribe).not.toHaveBeenCalled()
          })
        })
      })
    })
  })
})
