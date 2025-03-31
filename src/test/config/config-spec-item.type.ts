import type { BaseIssue, BaseSchema } from 'valibot'

export type ConfigSpecItem = {
  transform?: BaseSchema<unknown, unknown, BaseIssue<unknown>>
  envVarName?: string
}
