import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const seedsDir = join(process.cwd(), 'database', 'seeds')
const files = readdirSync(seedsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort()

if (files.length === 0) {
  console.error('No seed files found in database/seeds')
  process.exit(1)
}

for (const file of files) {
  const sql = readFileSync(join(seedsDir, file), 'utf8')
  const result = spawnSync(
    'docker',
    [
      'compose',
      'exec',
      '-T',
      'db',
      'psql',
      '-U',
      'ismw',
      '-d',
      'ismw_db',
      '-v',
      'ON_ERROR_STOP=1',
      '-f',
      '-',
    ],
    { input: sql, stdio: ['pipe', 'inherit', 'inherit'] },
  )

  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }

  console.log(`seeded ${file}`)
}
