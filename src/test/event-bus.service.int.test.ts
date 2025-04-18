import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { afterAll, afterEach, describe, expect, test } from '@jest/globals'
import type { BaseEventBusService } from '@main/domain/event-bus/base-event-bus.service.js'
import { createEventBusService } from '@main/event-bus.service.js'
import {
  FsEventBusService,
  type FsEventBusServiceConfig,
} from '@main/infra/event-bus/fs/fs-event-bus.service.js'
import type { MemoryEventBusServiceConfig } from '@main/infra/event-bus/memory/memory-event-bus.service.js'
import type { RabbitmqEventBusServiceConfig } from '@main/infra/event-bus/rabbitmq/rabbitmq-event-bus.service.js'
import type { RedisEventBusServiceConfig } from '@main/infra/event-bus/redis/redis-event-bus.service.js'
import { testEventBus } from '@test/event-bus-testing.helper.js'
import { baseDir } from '@test/util/base-dir.js'
import { waitFor } from '@test/util/helper.js'
import { isPortOpen } from '@test/util/network-helper.js'
import { getTestLogger } from '@test/util/testing-logger.js'

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

describe('integration testss', () => {
  describe('infra - event bus', () => {
    describe('EventBusService', () => {
      let eventBus: BaseEventBusService
      afterEach(async () => {
        if (eventBus) {
          await eventBus.stop()
        }
      })
      describe('all implementations', () => {
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
        afterAll(async () => {
          await cleanIfFs()
        })
        const testcases: { spec: TestSpec }[] = [
          { spec: { type: 'memory' } },
          { spec: { type: 'memory', eventBusMemoryEmitDelay: 1 } },
          { spec: { type: 'fs' } },
          { spec: { type: 'fs', eventBusFsPollingDelayMs: 20 } },
          {
            spec: {
              type: 'fs',
              eventBusFsBaseDataDir: dataRootDir,
              eventBusFsPollingDelayMs: 20,
            },
          },
          { spec: { type: 'redis' } },
          { spec: { type: 'rabbitmq' } },
        ]
        const testShouldSkip = async (spec: TestSpec) => {
          let portOpen = false
          switch (spec.type) {
            case 'redis':
              portOpen = await isPortOpen(6379, { timeout: 500 })
              break
            case 'rabbitmq':
              portOpen = await isPortOpen(5672, { timeout: 500 })
              break
            case 'memory':
            case 'fs':
              portOpen = true
          }
          if (!portOpen) {
            console.warn(
              `Skipping test because ${spec.type} port is not opened`,
            )
          }
          return !portOpen
        }
        test.each(testcases)(
          'should receive messages given $spec',
          async ({ spec }) => {
            // Given
            await cleanIfFs(spec)
            if (await testShouldSkip(spec)) {
              return
            }
            eventBus = createEventBusService({
              ...spec,
              logger: getTestLogger(),
            })
            await testEventBus(eventBus)
          },
        )
        describe('sendAndWait', () => {
          test.each(testcases)(
            'should send a message and wait for response given $spec',
            async ({ spec }) => {
              // Given
              await cleanIfFs(spec)
              if (await testShouldSkip(spec)) {
                return
              }
              eventBus = createEventBusService({
                ...spec,
                logger: getTestLogger(),
              })
              await eventBus.start()
              eventBus.once('foo', (data: unknown) => {
                expect(data).toBe('bar')
                eventBus.send('hello', 'world!')
              })
              // When
              const response = await eventBus.sendAndWait(
                'foo',
                'hello',
                'oops',
                'bar',
                { timeout: 10000 },
              )
              // Then
              expect(response).toBe('world!')
            },
          )
          test.each(testcases)(
            'should send a message and wait for error given $spec',
            async ({ spec }) => {
              // Given
              await cleanIfFs(spec)
              if (await testShouldSkip(spec)) {
                return
              }
              const expectedError = new Error('bad things happened!')
              eventBus = createEventBusService({
                ...spec,
                logger: getTestLogger(),
              })
              await eventBus.start()
              eventBus.once('foo', (data: unknown) => {
                expect(data).toBe('bar')
                eventBus.send('oops', 'bad things happened!')
              })
              // When
              const promise = eventBus.sendAndWait(
                'foo',
                'hello',
                'oops',
                'bar',
                { timeout: 10000 },
              )
              // Then
              await expect(promise).rejects.toStrictEqual(expectedError)
            },
          )
          test.each(testcases)(
            'should throw a timeout error given given $spec and timeout has expired',
            async ({ spec }) => {
              // Given
              await cleanIfFs(spec)
              if (await testShouldSkip(spec)) {
                return
              }
              if (spec.type === 'memory' && !spec.eventBusMemoryEmitDelay) {
                return
              }
              eventBus = createEventBusService({
                ...spec,
                logger: getTestLogger(),
              })
              await eventBus.start()
              eventBus.once('foo', (data: unknown) => {
                expect(data).toBe('bar')
                eventBus.send('hello', 'world!')
              })
              const expectedErrorMessage = 'Timeout expired!'
              const expectedError = new Error(expectedErrorMessage)
              // When
              const promise = eventBus.sendAndWait(
                'foo',
                'hello',
                'oops',
                'bar',
                { timeout: 1 },
              )
              // Then
              await expect(promise).rejects.toStrictEqual(expectedError)
            },
          )
        })
        describe('waitFor', () => {
          test.each(testcases)(
            'should wait for a message given $spec',
            async ({ spec }) => {
              // Given
              await cleanIfFs(spec)
              if (await testShouldSkip(spec)) {
                return
              }
              eventBus = createEventBusService({
                ...spec,
                logger: getTestLogger(),
              })
              await eventBus.start()
              // When
              const promise = eventBus.waitFor('foo')
              // Then
              setTimeout(() => {
                eventBus.send('foo', 'bar')
              }, 1)
              await expect(promise).resolves.toBe('bar')
            },
          )
          test.each(testcases)(
            'should wait for a message given $spec and a timeout',
            async ({ spec }) => {
              // Given
              await cleanIfFs(spec)
              if (await testShouldSkip(spec)) {
                return
              }
              eventBus = createEventBusService({
                ...spec,
                logger: getTestLogger(),
              })
              await eventBus.start()
              // When
              const promise = eventBus.waitFor('foo', { timeout: 5000 })
              // Then
              setTimeout(() => {
                eventBus.send('foo', 'bar')
              }, 1)
              await expect(promise).resolves.toBe('bar')
            },
          )
          test.each(testcases)(
            'should fail waiting for a message given $spec and a timeout that expired',
            async ({ spec }) => {
              // Given
              await cleanIfFs(spec)
              if (await testShouldSkip(spec)) {
                return
              }
              eventBus = createEventBusService({
                ...spec,
                logger: getTestLogger(),
              })
              await eventBus.start()
              const expectedErrorMessage = 'Timeout expired!'
              const expectedError = new Error(expectedErrorMessage)
              // When
              const promise = eventBus.waitFor('foo', { timeout: 1 })
              // Then
              setTimeout(() => {
                eventBus.send('foo', 'bar')
              }, 1)
              await expect(promise).rejects.toStrictEqual(expectedError)
            },
          )
        })
      })
      describe('fs', () => {
        test('should do nothing when stop twice given a fs event bus', async () => {
          // Given
          eventBus = createEventBusService({
            logger: getTestLogger(),
            eventBusFsPollingDelayMs: 100,
            type: 'fs',
          })
          await eventBus.start()
          await waitFor(100)
          // When
          await eventBus.stop()
        })
      })
    })
  })
})
