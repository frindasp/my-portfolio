import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const root = process.cwd()
const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
const skip = new Set(['node_modules', '.next', '.git', 'dist', 'coverage'])
const issues = []
const markers = ['<'.repeat(7), '='.repeat(7), '>'.repeat(7)]

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (skip.has(name)) continue
    const file = join(dir, name)
    const stat = statSync(file)
    if (stat.isDirectory()) {
      walk(file)
      continue
    }

    if (!stat.isFile() || !exts.has(extname(file))) continue
    const content = readFileSync(file, 'utf8')

    if (markers.every((marker) => content.includes(marker))) {
      issues.push(file.replace(`${root}/`, ''))
    }
  }
}

walk(root)

if (issues.length > 0) {
  console.error('Lint checks failed. Conflict markers found in:')
  issues.forEach((file) => console.error(`- ${file}`))
  process.exit(1)
}

console.log('Lint checks passed (no git conflict markers found).')
