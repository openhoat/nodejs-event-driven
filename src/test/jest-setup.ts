import { join } from 'node:path'
import { baseDir } from '@test/util/base-dir.js'
import { config as dotenvConfig } from 'dotenv'

const verbose = process.env.VERBOSE === 'true'

if (verbose) {
  console.debug('Loading env from .env.test')
}
dotenvConfig({ path: join(baseDir, '.env.test') })
