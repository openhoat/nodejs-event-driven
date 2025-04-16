import { join } from 'node:path'
import { baseDir } from '@test/util/base-dir.js'
import { config as dotenvConfig } from 'dotenv'

const { VERBOSE } = process.env
const isVerbose = VERBOSE === 'true'

if (isVerbose) {
  console.debug('Loading env from .env.test')
}
dotenvConfig({ path: join(baseDir, '.env.test') })
