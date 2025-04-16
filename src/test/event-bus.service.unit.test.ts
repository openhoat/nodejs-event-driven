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
} from '@main/domain/event-bus/base-event-bus.service.js'
import type { EventBusServiceConfig } from '@main/event-bus.service.js'
import { mockModules } from '@test/util/testing-helper.js'

describe('unit tests', () => {
  describe('EventBusService', () => {
    describe('createEventBusService', () => {
      let fakes: {
        createMemoryEventBusService: jest.Mock
        createFsEventBusService: jest.Mock
        createRedisEventBusService: jest.Mock
        createRabbitmqEventBusService: jest.Mock
        bus: jest.Mocked<BaseEventBusService<string>>
      }
      let createEventBusService: BaseEventBusServiceBuilder<EventBusServiceConfig>
      beforeAll(async () => {
        fakes = {
          bus: {
            send: jest.fn(),
            on: jest.fn(),
            once: jest.fn(),
            off: jest.fn(),
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            sendAndWait: jest.fn<() => Promise<any>>(),
            start: jest.fn(),
            stop: jest.fn(),
          } as unknown as jest.Mocked<BaseEventBusService<string>>,
          createMemoryEventBusService: jest.fn(),
          createFsEventBusService: jest.fn(),
          createRedisEventBusService: jest.fn(),
          createRabbitmqEventBusService: jest.fn(),
        }
        mockModules([
          [
            '@main/infra/event-bus/memory/memory-event-bus.service.js',
            { createMemoryEventBusService: fakes.createMemoryEventBusService },
          ],
          [
            '@main/infra/event-bus/fs/fs-event-bus.service.js',
            {
              createFsEventBusService: fakes.createFsEventBusService,
            },
          ],
          [
            '@main/infra/event-bus/redis/redis-event-bus.service.js',
            {
              createRedisEventBusService: fakes.createRedisEventBusService,
            },
          ],
          [
            '@main/infra/event-bus/rabbitmq/rabbitmq-event-bus.service.js',
            {
              createRabbitmqEventBusService:
                fakes.createRabbitmqEventBusService,
            },
          ],
        ])
        createEventBusService = (await import('@main/event-bus.service.js'))
          .createEventBusService
      })
      beforeEach(() => {
        fakes.createMemoryEventBusService.mockReturnValue(fakes.bus)
        fakes.createFsEventBusService.mockReturnValue(fakes.bus)
        fakes.createRedisEventBusService.mockReturnValue(fakes.bus)
        fakes.createRabbitmqEventBusService.mockReturnValue(fakes.bus)
      })
      afterEach(() => {
        jest.resetAllMocks()
      })
      afterAll(() => {
        jest.restoreAllMocks()
      })
      const testcases: EventBusServiceConfig[] = [
        { type: 'memory' },
        { type: 'fs' },
        { type: 'redis' },
        { type: 'rabbitmq' },
      ]
      describe.each(testcases)('given event bus type is "$type"', (config) => {
        describe('createEventBusService', () => {
          test('should create an instance of event bus service implementation', () => {
            // When
            createEventBusService(config)
            // Then
            switch (config.type) {
              case 'fs':
                expect(fakes.createFsEventBusService).toHaveBeenCalledTimes(1)
                expect(fakes.createFsEventBusService).toHaveBeenCalledWith(
                  config,
                )
                break
              case 'redis':
                expect(fakes.createRedisEventBusService).toHaveBeenCalledTimes(
                  1,
                )
                expect(fakes.createRedisEventBusService).toHaveBeenCalledWith(
                  config,
                )
                break
              case 'rabbitmq':
                expect(
                  fakes.createRabbitmqEventBusService,
                ).toHaveBeenCalledTimes(1)
                expect(
                  fakes.createRabbitmqEventBusService,
                ).toHaveBeenCalledWith(config)
                break
              default:
                expect(fakes.createMemoryEventBusService).toHaveBeenCalledTimes(
                  1,
                )
                expect(fakes.createMemoryEventBusService).toHaveBeenCalledWith(
                  config,
                )
            }
          })
        })
      })
    })
  })
})
