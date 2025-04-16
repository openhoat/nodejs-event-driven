import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const thisScriptDir = dirname(fileURLToPath(import.meta.url))
const currentDir = process.cwd()
console.log('currentDir', currentDir)
const absoluteBaseDir = resolve(thisScriptDir, '../../..')
console.log('absoluteBaseDir: ', absoluteBaseDir)

export const baseDir = relative(currentDir, absoluteBaseDir)
console.log('baseDir: ', baseDir)
