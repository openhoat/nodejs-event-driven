export const waitFor = (delayMs: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs)
  })
