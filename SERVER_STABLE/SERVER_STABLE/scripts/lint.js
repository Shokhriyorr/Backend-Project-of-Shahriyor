import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import YAML from 'yaml'

function collectJavaScriptFiles(startPath) {
  if (!fs.existsSync(startPath)) {
    return []
  }

  const entries = fs.readdirSync(startPath, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(startPath, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectJavaScriptFiles(fullPath))
    } else if (entry.isFile() && fullPath.endsWith('.js')) {
      files.push(fullPath)
    }
  }

  return files
}

for (const directory of ['src', 'tests', 'scripts']) {
  for (const file of collectJavaScriptFiles(path.join(process.cwd(), directory))) {
    execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' })
  }
}

const rawSqlPatterns = [
  /\$queryRaw|\$executeRaw|queryRaw|executeRaw/,
  /\bSELECT\s+.+\s+FROM\b/i,
  /\bINSERT\s+INTO\b/i,
  /\bUPDATE\s+\w+\s+SET\b/i,
  /\bDELETE\s+FROM\b/i,
  /\bCREATE\s+TABLE\b/i,
  /\bALTER\s+TABLE\b/i,
  /\bDROP\s+TABLE\b/i,
]

for (const file of collectJavaScriptFiles(path.join(process.cwd(), 'src'))) {
  const content = fs.readFileSync(file, 'utf8')
  const matchedPattern = rawSqlPatterns.find((pattern) => pattern.test(content))

  if (matchedPattern) {
    throw new Error(`Raw SQL-like access is not allowed in application code: ${path.relative(process.cwd(), file)}`)
  }
}

YAML.parse(fs.readFileSync(path.join(process.cwd(), 'openapi.yaml'), 'utf8'))
execFileSync(process.execPath, [path.join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js'), 'validate'], {
  stdio: 'inherit',
})

console.log('Lint checks passed.')
