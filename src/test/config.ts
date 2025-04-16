import type { ConfigCustom } from '@test/util/config-builder.js'
import * as v from 'valibot'

const schema = v.object({
  eventBusFsBaseDataDir: v.optional(v.string()),
  eventBusFsPollingDelayMs: v.optional(v.number()),
  eventBusMemoryEmitDelay: v.optional(v.number()),
  eventBusType: v.optional(v.picklist(['memory', 'fs', 'redis', 'rabbitmq'])),
  logLevel: v.optional(
    v.picklist(['silent', 'fatal', 'error', 'warn', 'info', 'debug', 'trace']),
  ),
})

export type Config = v.InferOutput<typeof schema>

const custom: ConfigCustom<Config> = {
  eventBusFsPollingDelayMs: {
    transform: v.optional(
      v.pipe(
        v.string(),
        v.transform((value) => Number(value)),
        v.number(),
      ),
    ),
  },
  eventBusMemoryEmitDelay: {
    transform: v.optional(
      v.pipe(
        v.string(),
        v.transform((value) => Number(value)),
        v.number(),
      ),
    ),
  },
}

export const configSpec = { schema, custom }
