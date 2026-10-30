/**
 * Store a private image in the database (served to members at /media/<name>).
 *   npx tsx scripts/upload-media.ts <name> <file>
 */
import './env'
import fs from 'node:fs'
import path from 'node:path'
import { Pool } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import { media } from '../src/db/schema'

const TYPES: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }

async function main() {
  const [name, file] = process.argv.slice(2)
  const contentType = file && TYPES[path.extname(file).toLowerCase()]
  if (!name || !contentType) throw new Error('Usage: npx tsx scripts/upload-media.ts <name> <file.png|jpg|webp>')
  const dataBase64 = fs.readFileSync(file).toString('base64')
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  await drizzle(pool)
    .insert(media)
    .values({ name, contentType, dataBase64 })
    .onConflictDoUpdate({ target: media.name, set: { contentType, dataBase64, updatedAt: new Date() } })
  await pool.end()
  console.log(`Stored ${name} (${Math.round((dataBase64.length * 3) / 4 / 1024)} KB)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
