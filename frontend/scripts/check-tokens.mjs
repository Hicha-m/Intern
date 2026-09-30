import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

// Small guard for our CSS source, not a general-purpose CSS parser.
const root = fileURLToPath(new URL('../src/', import.meta.url))
function cssFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? cssFiles(join(dir, entry.name)) : entry.name.endsWith('.css') ? [join(dir, entry.name)] : [])
}
const sources = cssFiles(root).map(path => ({ path: relative(root, path), css: readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '') }))
const defined = new Set(sources.flatMap(({ css }) => [...css.matchAll(/(--[\w-]+)\s*:/g)].map(match => match[1])))
const failures = []
for (const { path, css } of sources) {
  for (const [, token] of css.matchAll(/var\(\s*(--[\w-]+)/g)) {
    if (!defined.has(token)) failures.push(`${path}: undefined token ${token}`)
  }
  if (['tokens.css', 'theme.css'].includes(path)) continue
  for (const [, property, value] of css.matchAll(/(?:^|[;{])\s*([-a-z]+)\s*:\s*([^;{}]+)/gm)) {
    if (/(?:\d|\.\d)(?:px|rem|em|ms)\b|#[\da-f]{3,8}\b|(?:rgb|hsl|oklch|color)\(/i.test(value)) {
      failures.push(`${path}: ${property}: ${value.trim()} — use a design token`)
    }
  }
  if (/var\(--(?:gray|orange)-(?:a)?\d+\)/.test(css)) failures.push(`${path}: use a semantic color, not a primitive palette step`)
}
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1 }
else console.log(`Token checks passed (${sources.length} CSS files, ${defined.size} token names).`)
