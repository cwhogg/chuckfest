import { expect, it } from 'vitest'
import { freshDb, seedMember } from './db'

it('migrates and inserts', async () => {
  const db = await freshDb()
  const m = await seedMember(db, { role: 'admin' })
  expect(m.role).toBe('admin')
})
