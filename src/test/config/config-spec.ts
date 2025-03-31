import type { ConfigSpecItem } from '@test/config/config-spec-item.type.js'
import * as v from 'valibot'

export const ConfigSchema = v.object({
  eventBusFsBaseDataDir: v.optional(v.string()),
  eventBusFsPollingDelayMs: v.optional(v.number()),
  eventBusMemoryEmitDelay: v.optional(v.number()),
  eventBusType: v.optional(v.picklist(['memory', 'fs', 'redis', 'rabbitmq'])),
  logLevel: v.optional(
    v.picklist(['silent', 'fatal', 'error', 'warn', 'info', 'debug', 'trace']),
  ),
})

export type Config = v.InferOutput<typeof ConfigSchema>

export type ConfigSpec = Partial<Record<keyof Config, ConfigSpecItem>>

export const configSpec: ConfigSpec = {
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
