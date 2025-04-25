import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from '@jest/globals'
import type { BaseEventBusService } from '@main/domain/event-bus/base-event-bus.service.js'
import {
  type RedisEventBusServiceConfig,
  createRedisEventBusService,
} from '@main/infra/event-bus/redis/redis-event-bus.service.js'
import { testSendingManyEvents } from '@test/event-bus-testing.helper.js'
import { isPortOpen } from '@test/util/network-helper.js'
import { getTestLogger } from '@test/util/testing-logger.js'

type TestSpec = Omit<RedisEventBusServiceConfig, 'logger'> | undefined

describe('integration testss', () => {
  describe('redis event bus', () => {
    const redisPort = 6379
    let redisPortOpen = false
    beforeAll(async () => {
      redisPortOpen = await isPortOpen(redisPort, { timeout: 500 })
      if (!redisPortOpen) {
        console.warn(`Skipping test because ${redisPort} port is not open`)
      }
    })
    describe('RedisEventBusService', () => {
      const testcases: { spec: TestSpec }[] = [{ spec: undefined }]
      describe.each(testcases)('given $spec', ({ spec }) => {
        let prefix: string
        let fooEventName: string
        let oopsEventName: string
        let bus: BaseEventBusService
        beforeEach(async () => {
          if (!redisPortOpen) {
            return
          }
          prefix = `${Date.now()}`
          fooEventName = `${prefix}-foo`
          oopsEventName = `${prefix}-oops`
          bus = createRedisEventBusService({
            ...spec,
            logger: getTestLogger(),
          })
          await bus.start()
        })
        afterEach(async () => {
          if (bus) {
            await bus.stop()
          }
        })
        describe('send', () => {
          test('should receive a message', async () => {
            if (!redisPortOpen) {
              return
            }
            // Given
            const promise = new Promise((resolve) => {
              bus.once(fooEventName, (data) => {
                resolve(data)
              })
            })
            // When
            bus.send(fooEventName, 'bar')
            await expect(promise).resolves.toBe('bar')
          })
          test('should receive messages', async () => {
            if (!redisPortOpen) {
              return
            }
            // When
            await testSendingManyEvents(bus)
          })
        })
        describe('sendAndWait', () => {
          let helloEventName: string
          beforeEach(() => {
            helloEventName = `${prefix}-hello`
          })
          test('should send a message and wait for response', async () => {
            if (!redisPortOpen) {
              return
            }
            // Given
            bus.once(fooEventName, (data: unknown) => {
              expect(data).toBe('bar')
              bus.send(helloEventName, 'world!')
            })
            // When
            const response = await bus.sendAndWait(
              fooEventName,
              helloEventName,
              'oops',
              'bar',
              { timeout: 10000 },
            )
            // Then
            expect(response).toBe('world!')
          })
          test('should send a message and wait for error', async () => {
            if (!redisPortOpen) {
              return
            }
            // Given
            const expectedError = new Error('bad things happened!')
            bus.once(fooEventName, (data: unknown) => {
              expect(data).toBe('bar')
              bus.send(oopsEventName, 'bad things happened!')
            })
            // When
            const promise = bus.sendAndWait(
              fooEventName,
              helloEventName,
              oopsEventName,
              'bar',
              {
                timeout: 10000,
              },
            )
            // Then
            await expect(promise).rejects.toStrictEqual(expectedError)
          })
          test('should throw a timeout error given timeout has expired', async () => {
            if (!redisPortOpen) {
              return
            }
            // Given
            const expectedErrorMessage = 'Timeout expired!'
            const expectedError = new Error(expectedErrorMessage)
            // When
            const promise = bus.sendAndWait(
              fooEventName,
              helloEventName,
              oopsEventName,
              'bar',
              {
                timeout: 10,
              },
            )
            // Then
            await expect(promise).rejects.toStrictEqual(expectedError)
          })
        })
        describe('stop', () => {
          test('should do nothing when stop twice given a fs event bus', async () => {
            if (!redisPortOpen) {
              return
            }
            // Given
            await bus.stop()
            // When
            await bus.stop()
          })
        })
        describe('waitFor', () => {
          test('should wait for a message', async () => {
            if (!redisPortOpen) {
              return
            }
            // When
            const promise = bus.waitFor(fooEventName)
            // Then
            bus.send(fooEventName, 'bar')
            await expect(promise).resolves.toBe('bar')
          })
          test('should wait for a message given a timeout', async () => {
            if (!redisPortOpen) {
              return
            }
            // When
            const promise = bus.waitFor(fooEventName, { timeout: 5000 })
            // Then
            bus.send(fooEventName, 'bar')
            await expect(promise).resolves.toBe('bar')
          })
          test('should fail waiting for a message given a timeout that expired', async () => {
            if (!redisPortOpen) {
              return
            }
            // Given
            const expectedErrorMessage = 'Timeout expired!'
            const expectedError = new Error(expectedErrorMessage)
            // When
            const promise = bus.waitFor(fooEventName, { timeout: 1 })
            // Then
            await expect(promise).rejects.toStrictEqual(expectedError)
          })
        })
      })
    })
  })
})
