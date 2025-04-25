import type { BaseEventBusServiceBuilder } from '@main/domain/event-bus/base-event-bus.service.js'
import {
  type FsEventBusServiceConfig,
  createFsEventBusService,
} from '@main/infra/event-bus/fs/fs-event-bus.service.js'
import {
  type KafkaEventBusServiceConfig,
  createKafkaEventBusService,
} from '@main/infra/event-bus/kafka/kafka-event-bus.service.js'
import {
  type MemoryEventBusServiceConfig,
  createMemoryEventBusService,
} from '@main/infra/event-bus/memory/memory-event-bus.service.js'
import {
  type RabbitmqEventBusServiceConfig,
  createRabbitmqEventBusService,
} from '@main/infra/event-bus/rabbitmq/rabbitmq-event-bus.service.js'
import {
  type RedisEventBusServiceConfig,
  createRedisEventBusService,
} from '@main/infra/event-bus/redis/redis-event-bus.service.js'

export type EventBusServiceConfig =
  | ({
      type: 'memory'
    } & MemoryEventBusServiceConfig)
  | ({
      type: 'fs'
    } & FsEventBusServiceConfig)
  | ({
      type: 'redis'
    } & RedisEventBusServiceConfig)
  | ({
      type: 'rabbitmq'
    } & RabbitmqEventBusServiceConfig)
  | ({
      type: 'kafka'
    } & KafkaEventBusServiceConfig)

export const createEventBusService: BaseEventBusServiceBuilder<
  EventBusServiceConfig
> = (config) => {
  switch (config.type) {
    case 'fs':
      return createFsEventBusService(config)
    case 'redis':
      return createRedisEventBusService(config)
    case 'rabbitmq':
      return createRabbitmqEventBusService(config)
    case 'kafka':
      return createKafkaEventBusService(config)
    default:
      return createMemoryEventBusService(config)
  }
}
