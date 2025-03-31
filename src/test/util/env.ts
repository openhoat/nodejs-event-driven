import { join } from 'node:path'
import { baseDir } from '@test/util/base-dir.js'
import { config as dotenvConfig } from 'dotenv'

const verbose = process.env.VERBOSE === 'true'

export const loadEnv = (envName?: string) => {
  if (verbose) {
    console.debug('Loading env from .env.local')
  }
  dotenvConfig({ path: join(baseDir, '.env.local') })
  if (envName && envName !== 'local') {
    if (verbose) {
      console.debug(`Loading env from .env.${envName}`)
    }
    dotenvConfig({ path: join(baseDir, `.env.${envName}`) })
  }
  if (verbose) {
    console.debug('Loading env from .env')
  }
  dotenvConfig({ path: join(baseDir, '.env') })
}
