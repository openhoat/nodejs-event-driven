[![codecov](https://codecov.io/gh/openhoat/nodejs-event-driven/graph/badge.svg?token=3LKLOU6TWJ)](https://codecov.io/gh/openhoat/nodejs-event-driven)

## NodeJS Event Driven

Purpose: provide an agnostic event driven solution using EventEmitter interface.

Features:
- In memory queue
- File system queue
- Redis queue
- RabbitMQ

### How it works

Simply instantiate an `EventBusService` and use it as an `EventEmitter` to publish or subscribe events.

### Getting started

- Install:
    ```shell
    npm i -S nodejs-event-driven
    ```
- Create `index.js`:
    ```js
    import EventBusService from 'nodejs-event-driven'
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
      const eventBusService = new EventBusService(config)
      try {
        await eventBusService.start()
        await new Promise((resolve) => {
          eventBusService.once('foo', (data) => {
            logger.info(`received event "foo": ${String(data)}.`)
            resolve()
          })
          logger.info('sending event "foo"…')
          eventBusService.send('foo', 'bar')
          logger.info('event "foo" sent.')
        })
      } finally {
        await eventBusService.stop()
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

- `type` (required): type of event bus.

  Supported values:
    - `memory` (default): in memory, without persistence.
    - `fs`: file system.
    - `redis`: Redis queue.
    - `rabbitmq`: RabbitMQ.
- `logger` (default:no log): any logger implementation implementing [Logger](https://raw.githubusercontent.com/openhoat/nodejs-event-driven/refs/heads/main/src/main/util/logger.ts) interface.

> All others properties depend on `type` value, matching following specs:

#### `memory`

- `eventBusMemoryEmitDelay` (default:0): duration used to wait (in ms) before sending events.

#### `fs`

- `eventBusFsBaseDataDir` (default: `/tmp/fs-event-bus`): base directory used to persist events file structure.
- `eventBusFsPollingDelayMs` (default: 0): delay of events files polling.

#### `redis`

- `keyPrefix` (default: `events`): key prefix used to store events in Redis.
- `url` (default: redis default): Redis host URL to connect with.

#### `rabbitmq`

- `url` (default: rabbitmq default): RabbitMQ host URL to connect with.

Enjoy!
