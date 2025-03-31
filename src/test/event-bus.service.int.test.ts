import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import type { BaseEventBusService } from '@main/base-event-bus.service.js'
import EventBusService from '@main/event-bus.service.js'
import FsEventBusService, {
  type FsEventBusServiceConfig,
} from '@main/infra/event-bus/fs/fs-event-bus.service.js'
import type { MemoryEventBusServiceConfig } from '@main/infra/event-bus/memory/memory-event-bus.service.js'
import type { RabbitmqEventBusServiceConfig } from '@main/infra/event-bus/rabbitmq/rabbitmq-event-bus.service.js'
import type { RedisEventBusServiceConfig } from '@main/infra/event-bus/redis/redis-event-bus.service.js'
import { getTestLogger, testEventBus } from '@test/event-bus-test.helper.js'
import { baseDir } from '@test/util/base-dir.js'
import { waitFor } from '@test/util/helper.js'
import { rimraf } from 'rimraf'

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
        beforeEach(async () => {
          await rimraf(dataRootDir)
          await rimraf(FsEventBusService.defaultDataRootDir)
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
          // { spec: { type: 'redis' } },
          // { spec: { type: 'rabbitmq' } },
        ]
        test.each(testcases)(
          'should receive messages given $spec',
          async ({ spec }) => {
            // Given
            eventBus = new EventBusService({
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
              eventBus = new EventBusService({
                ...spec,
                logger: getTestLogger(),
              })
              await eventBus.start()
              eventBus.once('foo', (data) => {
                expect(data).toBe('bar')
                eventBus.send('hello', 'world!')
              })
              // When
              const response = await eventBus.sendAndWait(
                'foo',
                'hello',
                'oops',
                'bar',
              )
              // Then
              expect(response).toBe('world!')
            },
          )
          test.each(testcases)(
            'should send a message and wait for error given $spec',
            async ({ spec }) => {
              // Given
              const expectedError = new Error('bad things happened!')
              eventBus = new EventBusService({
                ...spec,
                logger: getTestLogger(),
              })
              await eventBus.start()
              eventBus.once('foo', (data) => {
                expect(data).toBe('bar')
                eventBus.send('oops', 'bad things happened!')
              })
              // When
              const promise = eventBus.sendAndWait(
                'foo',
                'hello',
                'oops',
                'bar',
              )
              // Then
              await expect(promise).rejects.toStrictEqual(expectedError)
            },
          )
        })
      })
      describe('fs', () => {
        test('should do nothing when stop twice given a fs event bus', async () => {
          // Given
          eventBus = new EventBusService({
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
