import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
} from '@jest/globals'
import type { BaseEventBusService } from '@main/domain/event-bus/base-event-bus.service.js'
import { createEventBusService } from '@main/event-bus.service.js'
import {
  FsEventBusService,
  type FsEventBusServiceConfig,
} from '@main/infra/event-bus/fs/fs-event-bus.service.js'
import type { KafkaEventBusServiceConfig } from '@main/infra/event-bus/kafka/kafka-event-bus.service.js'
import type { MemoryEventBusServiceConfig } from '@main/infra/event-bus/memory/memory-event-bus.service.js'
import type { RabbitmqEventBusServiceConfig } from '@main/infra/event-bus/rabbitmq/rabbitmq-event-bus.service.js'
import type { RedisEventBusServiceConfig } from '@main/infra/event-bus/redis/redis-event-bus.service.js'
import { testSendingManyEvents } from '@test/event-bus-testing.helper.js'
import { baseDir } from '@test/util/base-dir.js'
import { isPortOpen } from '@test/util/network-helper.js'
import { getTestLogger } from '@test/util/testing-logger.js'

const dataRootDir = join(baseDir, 'tmp/events')

const cleanIfFs = async (spec?: TestSpec) => {
  if (spec && spec.type !== 'fs') {
    return Promise.resolve()
  }
  try {
    await rm(dataRootDir, { recursive: true, force: true })
  } catch (err) {
    console.warn(err)
  }
  try {
    await rm(FsEventBusService.defaultDataRootDir, {
      recursive: true,
      force: true,
    })
  } catch (err) {
    console.warn(err)
  }
}

const testShouldSkip = async (spec: TestSpec) => {
  let portOpen = false
  switch (spec.type) {
    case 'redis':
      portOpen = await isPortOpen(6379, { timeout: 500 })
      break
    case 'rabbitmq':
      portOpen = await isPortOpen(5672, { timeout: 500 })
      break
    case 'kafka':
      portOpen = await isPortOpen(9092, { timeout: 500 })
      break
    case 'memory':
    case 'fs':
      portOpen = true
  }
  if (!portOpen) {
    console.warn(`Skipping test because ${spec.type} port is not opened`)
  }
  return !portOpen
}

type TestSpec =
  | ({
      type: 'memory'
    } & Omit<MemoryEventBusServiceConfig, 'logger'>)
  | ({
      type: 'fs'
    } & Omit<FsEventBusServiceConfig, 'logger'>)
  | ({
      type: 'redis'
    } & Omit<RedisEventBusServiceConfig, 'logger'>)
  | ({
      type: 'rabbitmq'
    } & Omit<RabbitmqEventBusServiceConfig, 'logger'>)
  | ({
      type: 'kafka'
    } & Omit<KafkaEventBusServiceConfig, 'logger'>)

describe('integration testss', () => {
  describe('infra - event bus', () => {
    describe('EventBusService', () => {
      describe('all implementations', () => {
        afterAll(async () => {
          await cleanIfFs()
        })
        const testcases: Record<string, Omit<TestSpec, 'type'>[]> = {
          memory: [{}, { eventBusMemoryEmitDelay: 1 }],
          fs: [
            {},
            { eventBusFsPollingDelayMs: 20 },
            {
              eventBusFsBaseDataDir: dataRootDir,
              eventBusFsPollingDelayMs: 20,
            },
          ],
          redis: [{}],
          rabbitmq: [{}],
          kafka: [{}],
        }
        describe.each(Object.keys(testcases))('%s', (type) => {
          const specs: { spec: TestSpec }[] = testcases[type].map((spec) => ({
            spec: { ...spec, type: type as TestSpec['type'] },
          }))
          describe.each(specs)('given $spec', ({ spec }) => {
            let bus: BaseEventBusService
            beforeEach(async () => {
              if (await testShouldSkip(spec)) {
                return
              }
              await cleanIfFs(spec)
              bus = createEventBusService({
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
            test('should receive a message', async () => {
              if (await testShouldSkip(spec)) {
                return
              }
              // Given
              const eventName = `${Date.now()}`
              const promise = new Promise((resolve) => {
                bus.once(eventName, (data) => {
                  console.log('data:', data)
                  resolve(data)
                })
              })
              // When
              bus.send(eventName, 'bar')
              await expect(promise).resolves.toBe('bar')
            })
            test('should receive messages', async () => {
              if (await testShouldSkip(spec)) {
                return
              }
              // When
              await testSendingManyEvents(bus)
            })
            describe('sendAndWait', () => {
              test('should send a message and wait for response', async () => {
                if (await testShouldSkip(spec)) {
                  return
                }
                // Given
                bus.once('foo', (data: unknown) => {
                  expect(data).toBe('bar')
                  bus.send('hello', 'world!')
                })
                // When
                const response = await bus.sendAndWait(
                  'foo',
                  'hello',
                  'oops',
                  'bar',
                  { timeout: 10000 },
                )
                // Then
                expect(response).toBe('world!')
              })
              test('should send a message and wait for error', async () => {
                if (await testShouldSkip(spec)) {
                  return
                }
                // Given
                const expectedError = new Error('bad things happened!')
                bus.once('foo', (data: unknown) => {
                  expect(data).toBe('bar')
                  bus.send('oops', 'bad things happened!')
                })
                // When
                const promise = bus.sendAndWait('foo', 'hello', 'oops', 'bar', {
                  timeout: 10000,
                })
                // Then
                await expect(promise).rejects.toStrictEqual(expectedError)
              })
              test('should throw a timeout error given timeout has expired', async () => {
                if (await testShouldSkip(spec)) {
                  return
                }
                if (spec.type === 'memory' && !spec.eventBusMemoryEmitDelay) {
                  return
                }
                // Given
                const expectedErrorMessage = 'Timeout expired!'
                const expectedError = new Error(expectedErrorMessage)
                // When
                const promise = bus.sendAndWait('foo', 'hello', 'oops', 'bar', {
                  timeout: 10,
                })
                // Then
                await expect(promise).rejects.toStrictEqual(expectedError)
              })
            })
            describe('waitFor', () => {
              test('should wait for a message', async () => {
                if (await testShouldSkip(spec)) {
                  return
                }
                // When
                const promise = bus.waitFor('foo')
                // Then
                process.nextTick(() => {
                  bus.send('foo', 'bar')
                })
                await expect(promise).resolves.toBe('bar')
              })
              test('should wait for a message given a timeout', async () => {
                if (await testShouldSkip(spec)) {
                  return
                }
                // When
                const promise = bus.waitFor('foo', { timeout: 5000 })
                // Then
                bus.send('foo', 'bar')
                await expect(promise).resolves.toBe('bar')
              })
              test('should fail waiting for a message given a timeout that expired', async () => {
                if (await testShouldSkip(spec)) {
                  return
                }
                // Given
                const expectedErrorMessage = 'Timeout expired!'
                const expectedError = new Error(expectedErrorMessage)
                // When
                const promise = bus.waitFor('foo', { timeout: 1 })
                // Then
                await expect(promise).rejects.toStrictEqual(expectedError)
              })
            })
          })
        })
      })
      describe('fs', () => {
        test('should do nothing when stop twice given a fs event bus', async () => {
          // Given
          const bus = createEventBusService({
            logger: getTestLogger(),
            eventBusFsPollingDelayMs: 100,
            type: 'fs',
          })
          await bus.start()
          await bus.stop()
          // When
          await bus.stop()
        })
      })
    })
  })
})
