import './env'
import { Pool } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import { migrate } from 'drizzle-orm/neon-serverless/migrator'

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required')
  const pool = new Pool({ connectionString: url })
  await migrate(drizzle({ client: pool }), { migrationsFolder: './drizzle' })
  await pool.end()
  console.log('Migrations applied')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
