import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import { setDb, type Db } from '@/db'
import * as schema from '@/db/schema'

/** A fresh, fully migrated in-memory Postgres wired in as the app's `db`. */
export async function freshDb(): Promise<Db> {
  const client = new PGlite()
  const db = drizzle({ client, schema })
  await migrate(db, { migrationsFolder: './drizzle' })
  setDb(db as unknown as Db)
  return db as unknown as Db
}

export async function seedMember(db: Db, over: Partial<typeof schema.members.$inferInsert> = {}) {
  const [m] = await db
    .insert(schema.members)
    .values({ name: 'Test', email: `${crypto.randomUUID()}@example.com`, ...over })
    .returning()
  return m
}

export async function seedSite(db: Db, over: Partial<typeof schema.sites.$inferInsert> = {}) {
  const [s] = await db
    .insert(schema.sites)
    .values({ name: 'Lake', permitType: 'rolling', permitAdvanceDays: 182, ...over })
    .returning()
  return s
}
