/**
 * Print a member's personal sign-in link (creating one if needed). For local testing
 * and for handing out links before SMS is live.
 *   npx tsx scripts/dev-link.ts cwhogg@gmail.com [base-url] [--out file]
 */
import './env'
import fs from 'node:fs'
import { Pool } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import { eq } from 'drizzle-orm'
import { members } from '../src/db/schema'
import { newToken } from '../src/lib/tokens'

async function main() {
  const [email, base = 'http://localhost:3000'] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
  const outIdx = process.argv.indexOf('--out')
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const db = drizzle({ client: pool })
  const [m] = await db.select().from(members).where(eq(members.email, email.toLowerCase()))
  if (!m) throw new Error(`No member with email ${email}`)
  let token = m.personalLinkToken
  if (!token) {
    token = newToken()
    await db.update(members).set({ personalLinkToken: token }).where(eq(members.id, m.id))
  }
  const link = `${base}/api/auth/personal-link?token=${token}`
  if (outIdx > 0) fs.writeFileSync(process.argv[outIdx + 1], link)
  else console.log(link)
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
