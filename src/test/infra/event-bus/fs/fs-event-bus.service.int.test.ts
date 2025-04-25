import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import type { BaseEventBusService } from '@main/domain/event-bus/base-event-bus.service.js'
import {
  FsEventBusService,
  type FsEventBusServiceConfig,
  createFsEventBusService,
} from '@main/infra/event-bus/fs/fs-event-bus.service.js'
import {
  cleanFs,
  testSendingManyEvents,
} from '@test/event-bus-testing.helper.js'
import { getTestLogger } from '@test/util/testing-logger.js'

type TestSpec = Omit<FsEventBusServiceConfig, 'logger'> | undefined

describe('integration testss', () => {
  describe('fs event bus', () => {
    describe('FsEventBusService', () => {
      const testcases: { spec: TestSpec }[] = [
        { spec: undefined },
        { spec: { eventBusFsPollingDelayMs: 20 } },
        {
          spec: {
            eventBusFsBaseDataDir: 'test-events',
            eventBusFsPollingDelayMs: 20,
          },
        },
      ]
      describe.each(testcases)('given $spec', ({ spec }) => {
        let prefix: string
        let fooEventName: string
        let oopsEventName: string
        let bus: BaseEventBusService
        let dataRootDir: string | undefined
        beforeEach(async () => {
          dataRootDir = spec?.eventBusFsBaseDataDir
            ? await mkdtemp(join(tmpdir(), spec.eventBusFsBaseDataDir))
            : undefined
          await cleanFs(dataRootDir ?? FsEventBusService.defaultDataRootDir)
          prefix = `${Date.now()}`
          fooEventName = `${prefix}-foo`
          oopsEventName = `${prefix}-oops`
          bus = createFsEventBusService({
            ...spec,
            eventBusFsBaseDataDir: dataRootDir,
            logger: getTestLogger(),
          })
          await bus.start()
        })
        afterEach(async () => {
          await cleanFs(dataRootDir ?? FsEventBusService.defaultDataRootDir)
          if (bus) {
            await bus.stop()
          }
        })
        describe('send', () => {
          test('should receive a message', async () => {
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
            // Given
            await bus.stop()
            // When
            await bus.stop()
          })
        })
        describe('waitFor', () => {
          test('should wait for a message', async () => {
            // When
            const promise = bus.waitFor(fooEventName)
            // Then
            bus.send(fooEventName, 'bar')
            await expect(promise).resolves.toBe('bar')
          })
          test('should wait for a message given a timeout', async () => {
            // When
            const promise = bus.waitFor(fooEventName, { timeout: 5000 })
            // Then
            bus.send(fooEventName, 'bar')
            await expect(promise).resolves.toBe('bar')
          })
          test('should fail waiting for a message given a timeout that expired', async () => {
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
