import { join } from 'node:path'
import { baseDir } from '@test/util/base-dir.js'
import { config as dotenvConfig } from 'dotenv'

const { VERBOSE } = process.env
const isVerbose = VERBOSE === 'true'

export const loadEnv = (envName?: string) => {
  if (isVerbose) {
    console.debug('Loading env from .env.local')
  }
  dotenvConfig({ path: join(baseDir, '.env.local') })
  if (envName && envName !== 'local') {
    if (isVerbose) {
      console.debug(`Loading env from .env.${envName}`)
    }
    dotenvConfig({ path: join(baseDir, `.env.${envName}`) })
  }
  if (isVerbose) {
    console.debug('Loading env from .env')
  }
  dotenvConfig({ path: join(baseDir, '.env') })
}
