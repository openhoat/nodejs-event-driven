import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const thisScriptDir = dirname(fileURLToPath(import.meta.url))
const currentDir = process.cwd()
const absoluteBaseDir = resolve(thisScriptDir, '../../..')

export const baseDir = relative(currentDir, absoluteBaseDir)
