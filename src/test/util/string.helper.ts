export const toCamelCase = (s: string) => {
  const re = /[_\- ]/g
  const words = s.split(re)
  return words
    .map((word, index) => {
      const firstLetter =
        index > 0 ? word.charAt(0).toUpperCase() : word.charAt(0).toLowerCase()
      const rest = word.slice(1).toLowerCase()
      return `${firstLetter}${rest}`
    })
    .join('')
}

export const toPascalCase = (s: string) =>
  s
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/\s+/g)
    .join('_')
    .toUpperCase()
