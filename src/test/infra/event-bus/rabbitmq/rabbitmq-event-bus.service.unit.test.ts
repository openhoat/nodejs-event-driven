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
import { waitFor } from '@test/util/helper.js'
import { mockModule } from '@test/util/testing-helper.js'
import { getTestLogger } from '@test/util/testing-logger.js'
import type { Channel, ChannelModel } from 'amqplib'

describe('unit tests', () => {
  describe('infra', () => {
    describe('event-bus', () => {
      describe('rabbitmq', () => {
        let fakeConnect: jest.Mocked<() => Promise<ChannelModel>>
        let createRabbitmqEventBusService: BaseEventBusServiceBuilder<BaseEventBusServiceConfig>
        let bus: BaseEventBusService
        const eventName = 'foo'
        let fakeConnection: jest.Mocked<ChannelModel>
        let fakeChannel: jest.Mocked<Channel>
        beforeAll(async () => {
          fakeConnect = jest.fn()
          mockModule('amqplib', { connect: fakeConnect })
          createRabbitmqEventBusService = (
            await import(
              '@main/infra/event-bus/rabbitmq/rabbitmq-event-bus.service.js'
            )
          ).createRabbitmqEventBusService
          const config: BaseEventBusServiceConfig = {
            logger: getTestLogger(),
          }
          bus = createRabbitmqEventBusService(config)
          fakeConnection = {
            close: jest.fn(),
            createChannel: jest.fn(),
          } as unknown as jest.Mocked<ChannelModel>
          fakeChannel = {
            assertQueue: jest.fn(),
            cancel: jest.fn(),
            close: jest.fn(),
            consume: jest.fn(),
            sendToQueue: jest.fn(),
          } as unknown as jest.Mocked<Channel>
        })
        beforeEach(async () => {
          fakeConnect.mockResolvedValue(fakeConnection)
          fakeConnection.createChannel.mockResolvedValue(fakeChannel)
          fakeChannel.close.mockResolvedValue()
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
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            const msg: any = { content: JSON.stringify('bar') }
            fakeChannel.consume.mockImplementation(
              // biome-ignore lint/suspicious/noExplicitAny: <explanation>
              (_eventName, consumeListener): Promise<any> => {
                consumeListener(msg)
                return Promise.resolve()
              },
            )
            await bus.start()
            expect(fakeConnect).toHaveBeenCalledTimes(1)
            expect(fakeConnect).toHaveBeenCalledWith(
              'amqp://guest:guest@localhost:5672',
            )
            // When
            bus.on(eventName, listener)
            // Then
            expect(fakeConnection.createChannel).toHaveBeenCalledTimes(1)
            expect(fakeConnection.createChannel).toHaveBeenCalledWith()
            await waitFor(1)
            expect(fakeChannel.assertQueue).toHaveBeenCalledTimes(1)
            expect(fakeChannel.assertQueue).toHaveBeenCalledWith(eventName, {
              durable: false,
            })
            expect(fakeChannel.consume).toHaveBeenCalledTimes(1)
            expect(fakeChannel.consume).toHaveBeenCalledWith(
              eventName,
              expect.any(Function),
              {
                consumerTag: 'foo',
                noAck: true,
              },
            )
            await bus.stop()
            expect(fakeChannel.cancel).toHaveBeenCalledTimes(1)
            expect(fakeChannel.cancel).toHaveBeenCalledWith(eventName)
            expect(fakeChannel.close).toHaveBeenCalledTimes(1)
            expect(fakeChannel.close).toHaveBeenCalledWith()
          })
          test('should listen to "foo" events given a null message', async () => {
            // Given
            const listener = jest.fn()
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            const msg: any = null
            fakeChannel.consume.mockImplementation(
              // biome-ignore lint/suspicious/noExplicitAny: <explanation>
              (_eventName, consumeListener): Promise<any> => {
                consumeListener(msg)
                return Promise.resolve()
              },
            )
            await bus.start()
            expect(fakeConnect).toHaveBeenCalledTimes(1)
            expect(fakeConnect).toHaveBeenCalledWith(
              'amqp://guest:guest@localhost:5672',
            )
            // When
            bus.on(eventName, listener)
            // Then
            expect(fakeConnection.createChannel).toHaveBeenCalledTimes(1)
            expect(fakeConnection.createChannel).toHaveBeenCalledWith()
            await waitFor(1)
            expect(fakeChannel.assertQueue).toHaveBeenCalledTimes(1)
            expect(fakeChannel.assertQueue).toHaveBeenCalledWith(eventName, {
              durable: false,
            })
            expect(fakeChannel.consume).toHaveBeenCalledTimes(1)
            expect(fakeChannel.consume).toHaveBeenCalledWith(
              eventName,
              expect.any(Function),
              {
                consumerTag: 'foo',
                noAck: true,
              },
            )
            await bus.stop()
            expect(fakeChannel.cancel).toHaveBeenCalledTimes(1)
            expect(fakeChannel.cancel).toHaveBeenCalledWith(eventName)
            expect(fakeChannel.close).toHaveBeenCalledTimes(1)
            expect(fakeChannel.close).toHaveBeenCalledWith()
          })
          test('should fail given connection is not initialized', async () => {
            // Given
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            fakeConnect.mockResolvedValue(null as any)
            const listener = jest.fn()
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            const msg: any = { content: JSON.stringify('bar') }
            fakeChannel.consume.mockImplementation(
              // biome-ignore lint/suspicious/noExplicitAny: <explanation>
              (_eventName, consumeListener): Promise<any> => {
                consumeListener(msg)
                return Promise.resolve()
              },
            )
            await bus.start()
            expect(fakeConnect).toHaveBeenCalledTimes(1)
            const expectedErrorMessage = 'Connection is not initialized'
            const expectedError = new Error(expectedErrorMessage)
            expect(fakeConnect).toHaveBeenCalledWith(
              'amqp://guest:guest@localhost:5672',
            )
            const errorPromise = new Promise((_resolve, reject) => {
              bus.onError((err) => {
                reject(err)
              })
            })
            // When
            bus.on(eventName, listener)
            // Then
            expect(fakeConnection.createChannel).toHaveBeenCalledTimes(0)
            expect(fakeChannel.assertQueue).toHaveBeenCalledTimes(0)
            await expect(errorPromise).rejects.toStrictEqual(expectedError)
            expect(fakeChannel.consume).toHaveBeenCalledTimes(0)
            await bus.stop()
            expect(fakeChannel.cancel).toHaveBeenCalledTimes(1)
            expect(fakeChannel.cancel).toHaveBeenCalledWith(eventName)
            expect(fakeChannel.close).toHaveBeenCalledTimes(1)
            expect(fakeChannel.close).toHaveBeenCalledWith()
          })
        })
        describe('once', () => {
          afterEach(async () => {
            await bus.stop()
          })
          test('should listen once to "foo" events', async () => {
            // Given
            const listener = jest.fn()
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            const msg: any = { content: JSON.stringify('bar') }
            fakeChannel.consume.mockImplementation(
              // biome-ignore lint/suspicious/noExplicitAny: <explanation>
              (_eventName, consumeListener): Promise<any> => {
                consumeListener(msg)
                return Promise.resolve()
              },
            )
            await bus.start()
            expect(fakeConnect).toHaveBeenCalledTimes(1)
            // When
            bus.once(eventName, listener)
            // Then
            expect(fakeConnection.createChannel).toHaveBeenCalledTimes(1)
            expect(fakeConnection.createChannel).toHaveBeenCalledWith()
            await waitFor(1)
            expect(fakeChannel.assertQueue).toHaveBeenCalledTimes(1)
            expect(fakeChannel.assertQueue).toHaveBeenCalledWith(eventName, {
              durable: false,
            })
            expect(fakeChannel.consume).toHaveBeenCalledTimes(1)
            expect(fakeChannel.consume).toHaveBeenCalledWith(
              eventName,
              expect.any(Function),
              {
                consumerTag: 'foo',
                noAck: true,
              },
            )
            await bus.stop()
            expect(fakeChannel.cancel).toHaveBeenCalledTimes(2)
            expect(fakeChannel.cancel).toHaveBeenNthCalledWith(1, eventName)
            expect(fakeChannel.cancel).toHaveBeenNthCalledWith(2, eventName)
            expect(fakeChannel.close).toHaveBeenCalledTimes(1)
            expect(fakeChannel.close).toHaveBeenCalledWith()
          })
        })
        describe('off', () => {
          afterEach(async () => {
            await bus.stop()
          })
          test('should stop listening to "foo" events', async () => {
            // Given
            const listener = jest.fn()
            await bus.start()
            bus.on(eventName, listener)
            await waitFor(1)
            fakeChannel.close.mockResolvedValue()
            // When
            bus.off(eventName, listener)
            // Then
            await waitFor(10)
            expect(fakeChannel.cancel).toHaveBeenCalledTimes(1)
            expect(fakeChannel.cancel).toHaveBeenCalledWith(eventName)
            expect(fakeChannel.close).toHaveBeenCalledTimes(1)
            expect(fakeChannel.close).toHaveBeenCalledWith()
          })
          test('should do nothing given channel does not exist', async () => {
            // Given
            const listener = jest.fn()
            await bus.start()
            // When
            bus.off(eventName, listener)
            // Then
            expect(fakeChannel.close).toHaveBeenCalledTimes(0)
          })
          test('should stop listening to "foo" events and fail silently to close channel', async () => {
            // Given
            const listener = jest.fn()
            await bus.start()
            bus.on(eventName, listener)
            await waitFor(1)
            const expectedErrorMessage = 'oops'
            const expectedError = new Error(expectedErrorMessage)
            fakeChannel.close.mockRejectedValue(expectedError)
            const errorPromise = new Promise((_resolve, reject) => {
              bus.onError((err) => {
                reject(err)
              })
            })
            // When
            bus.off(eventName, listener)
            // Then
            await expect(errorPromise).rejects.toStrictEqual(expectedError)
            await waitFor(10)
            expect(fakeChannel.cancel).toHaveBeenCalledTimes(1)
            expect(fakeChannel.cancel).toHaveBeenCalledWith(eventName)
            expect(fakeChannel.close).toHaveBeenCalledTimes(1)
            expect(fakeChannel.close).toHaveBeenCalledWith()
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
            const expectedBuffer = Buffer.from(JSON.stringify(eventValue))
            // When
            bus.send(eventName, eventValue)
            // Then
            await waitFor(1)
            expect(fakeChannel.sendToQueue).toHaveBeenCalledTimes(1)
            expect(fakeChannel.sendToQueue).toHaveBeenNthCalledWith(
              1,
              eventName,
              expectedBuffer,
            )
          })
        })
      })
    })
  })
})
