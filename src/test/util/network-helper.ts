import { Socket } from 'node:net'

export const isPortOpen = async (
  port: number,
  options?: { host?: string; timeout?: number },
): Promise<boolean> => {
  const socket = new Socket()
  const { host = '0.0.0.0', timeout = 1000 } = options ?? {}
  try {
    return await new Promise((resolve, reject) => {
      const timeoutExpired = () => {
        resolve(false)
      }
      socket.on('timeout', timeoutExpired)
      socket.on('connect', () => resolve(true))
      socket.on('error', (err) => {
        const error = err as { code?: string }
        if (error.code === 'ECONNREFUSED') {
          resolve(false)
        }
        reject(err)
      })
      setTimeout(timeoutExpired, timeout)
      socket.connect(port, host)
    })
  } finally {
    socket.destroy()
  }
}
