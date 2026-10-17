import { Pool } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import * as schema from './schema'

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>

let instance: Db | undefined

function connect(): Db {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  return drizzle({ client: new Pool({ connectionString: url }), schema }) as unknown as Db
}

/** The shared database handle. Tests swap it for an in-memory PGlite via `setDb`. */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    instance ??= connect()
    const value = Reflect.get(instance, prop)
    return typeof value === 'function' ? value.bind(instance) : value
  },
})

export function setDb(next: Db) {
  instance = next
}

export { schema }
