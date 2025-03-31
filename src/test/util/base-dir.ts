import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const thisScriptDir = dirname(fileURLToPath(import.meta.url))
const currentDir = process.cwd()

export const baseDir = relative(currentDir, resolve(thisScriptDir, '../../..'))
