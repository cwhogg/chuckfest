import { defineConfig } from 'drizzle-kit'

// `drizzle-kit generate` never connects; migrations are applied by scripts/db-migrate.ts.
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? 'postgres://unused@localhost/unused' },
})
