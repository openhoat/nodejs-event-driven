[![NPM Version](https://img.shields.io/npm/v/nodejs-event-driven)](https://www.npmjs.com/package/nodejs-event-driven)
[![codecov](https://codecov.io/gh/openhoat/nodejs-event-driven/graph/badge.svg?token=3LKLOU6TWJ)](https://codecov.io/gh/openhoat/nodejs-event-driven)
![Quality Gate Status](https://raw.githubusercontent.com/openhoat/nodejs-event-driven/refs/heads/main/sonar/qa.svg)

## NodeJS Event Driven

Purpose: provide an agnostic event driven solution inspired by the simplicity of EventEmitter interface.

Features:
- In memory queue
- File system queue
- Redis queue
- RabbitMQ
- Kafka

### How it works

Simply instantiate an `EventBusService` and use it as an `EventEmitter` to publish or subscribe events.

Example:

```js
import { createEventBusService } from 'nodejs-event-driven'

const bus = createEventBusService({ type: 'memory' })
await bus.start()
bus.on('hello', (data) => {
  console.log('data:', data)
})
bus.send('hello', 'world!')
```

### Getting started

- Install:
    ```shell
    npm i -S nodejs-event-driven
    ```
- Create `index.js`:
    ```js
    import { createEventBusService } from 'nodejs-event-driven'
    import pino from 'pino'
    
    /**
     * @type {nodejs-event-driven.Logger}
     */
    const logger = pino({
      level: 'info',
      transport: {
        target: 'pino-pretty',
      },
    })
    
    const run = async () => {
      /**
       * @type {EventBusServiceConfig}
       */
      const config = {
        type: 'memory',
        logger,
      }
      const bus = createEventBusService(config)
      try {
        await bus.start()
        await new Promise((resolve) => {
          bus.once('foo', (data) => {
            logger.info(`received event "foo": ${String(data)}.`)
            resolve()
          })
          logger.info('sending event "foo"…')
          bus.send('foo', 'bar')
          logger.info('event "foo" sent.')
        })
      } finally {
        await bus.stop()
      }
    }
    
    void run()
    ```
- Execute:
  ```shell
  node ./index.js
  ```
- Expected result:
  ```shell
  [16:23:53.509] INFO (33149): sending event "foo"…
  [16:23:53.509] INFO (33149): event "foo" sent.
  [16:23:53.510] INFO (33149): received event "foo": bar.
  ```

### Configuration

Object used in `EventBusService` constructor to pass configuration.

Configuration properties:

- `type` (required): Type of event bus.

  Supported values:
    - `memory` (default): In memory, without persistence.
    - `fs`: File system.
    - `redis`: Redis queue.
    - `rabbitmq`: RabbitMQ.
    - `kafka`: Kafka.
- `logger` (default: no log): Any logger implementation implementing [Logger](https://raw.githubusercontent.com/openhoat/nodejs-event-driven/refs/heads/main/src/main/util/logger.ts) interface.

> All others properties depend on `type` value, matching the following specs:

#### `memory`

- `eventBusMemoryEmitDelay` (default: 0): Duration used to wait (in ms) before sending events.

#### `fs`

- `eventBusFsBaseDataDir` (default: `{tmp-dir}/fs-event-bus`): Base directory used to persist events file structure.
- `eventBusFsPollingDelayMs` (default: 0): Delay of events files polling.

#### `redis`

- `keyPrefix` (default: `events`): Key prefix used to store events in Redis.
- `url` (default: redis default): Redis host URL to connect with.

  See [Redis documentation](https://github.com/redis/node-redis) for more information about other configuration properties:
- `database`: Redis database number.
- `name`: Client name.
- `password`: ACL password.
- `username`: ACL username.

#### `rabbitmq`

- `url` (default: rabbitmq default): RabbitMQ host URL to connect with.

#### `kafka`

- `brokers` (default: ['localhost:9092']): Brokers to connect to.
- `clientId` (default: 'app'): Client ID.
- `topicPrefix`: if set, used as a topic prefix (resulting topic becomes `${prefix}-$[topic}`).

### Prerequisite

- Install `redis` NPM dependency to be able to use Redis with `nodejs-event-driven`.
  ```shell
  npm install redis
  ```
- Install `amqplib` NPM dependency to be able to use RabbitMQ with `nodejs-event-driven`.
  ```shell
  npm install amqplib
  ```
- Install `kafkajs` NPM dependency to be able to use Kafka with `nodejs-event-driven`.
  ```shell
  npm install kafkajs
  ```

> `redis`, `amqplib` and `kafkajs` are declared as optional dependencies in `nodejs-event-driven`.

Enjoy!
