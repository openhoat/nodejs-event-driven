import {
  type Config,
  ConfigSchema,
  type ConfigSpec,
  configSpec,
} from '@test/config/config-spec.js'
import { loadEnv } from '@test/util/env.js'
import { toPascalCase } from '@test/util/string.helper.js'
import * as v from 'valibot'

loadEnv(process.env.ENVIRONMENT)

const config: Config = v.parse(
  ConfigSchema,
  Object.keys(ConfigSchema.entries).reduce(
    (acc, name) => {
      const spec = configSpec[name as keyof ConfigSpec]
      const envVarName = spec?.envVarName ?? toPascalCase(name)
      const envVarValue = process.env[envVarName]
      if (envVarValue === undefined) {
        return acc
      }
      const transform =
        spec?.transform ?? ConfigSchema.entries[name as keyof Config]
      acc[name] = v.parse(transform, envVarValue)
      return acc
    },
    {} as Record<string, unknown>,
  ),
)

if (process.env.VERBOSE === 'true') {
  console.debug('Loaded config:', config)
}

export default config
