'use server'

import { revalidatePath } from 'next/cache'
import { parse } from 'csv-parse/sync'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { members } from '@/db/schema'
import { adminOrThrow } from '@/server/session'
import { attempt } from '@/server/result'
import { addMember, adminUpdateMember, normalizePhone, personalLinkFor, reissuePersonalLink } from '@/server/members'
import { appUrl } from '@/server/jobs'

const txt = (f: FormData, k: string) => String(f.get(k) ?? '').trim() || null
const done = () => revalidatePath('/admin/members')

export async function updateMember(id: string, formData: FormData) {
  return attempt(async () => {
    const admin = await adminOrThrow()
    const email = txt(formData, 'email')
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid email')
    await adminUpdateMember(admin.id, id, {
      name: txt(formData, 'name') ?? undefined,
      email,
      phone: txt(formData, 'phone'),
      role: formData.get('role') === 'admin' ? 'admin' : 'member',
      isActive: formData.get('isActive') === 'on',
    })
    done()
  })
}

export async function createMember(formData: FormData) {
  return attempt(async () => {
    const admin = await adminOrThrow()
    const name = txt(formData, 'name')
    const email = txt(formData, 'email')
    if (!name || !email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Name and a valid email are required')
    await addMember(admin.id, { name, email, phone: txt(formData, 'phone') })
    done()
  })
}

/**
 * Paste a roster: one member per line, "name, email, phone". Matches existing members
 * by email, then by name (first name or full name), and updates them; adds the rest.
 */
export async function importRoster(formData: FormData) {
  return attempt(async () => {
    const admin = await adminOrThrow()
    const rows: string[][] = parse(String(formData.get('roster') ?? ''), { relax_column_count: true, skip_empty_lines: true, trim: true })
    const everyone = await db.select().from(members)
    let updated = 0
    let added = 0
    const problems: string[] = []
    for (const [name, emailRaw, phoneRaw] of rows) {
      if (!name || name.toLowerCase() === 'name') continue
      const email = emailRaw?.toLowerCase()
      if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        problems.push(`${name}: missing email`)
        continue
      }
      let phone: string | null = null
      try {
        phone = normalizePhone(phoneRaw)
      } catch {
        problems.push(`${name}: phone "${phoneRaw}" skipped`)
      }
      const first = name.split(/\s+/)[0].toLowerCase()
      const match =
        everyone.find((m) => m.email === email) ??
        everyone.find((m) => m.name.toLowerCase() === name.toLowerCase()) ??
        everyone.filter((m) => m.name.split(/\s+/)[0].toLowerCase() === first).at(0)
      if (match) {
        await db.update(members).set({ name, email, ...(phone ? { phone } : {}) }).where(eq(members.id, match.id))
        updated++
      } else {
        await addMember(admin.id, { name, email, phone })
        added++
      }
    }
    done()
    return `Updated ${updated}, added ${added}.${problems.length ? ` Check: ${problems.join('; ')}.` : ''}`
  })
}

export async function getPersonalLink(memberId: string) {
  return attempt(async () => {
    await adminOrThrow()
    return appUrl(await personalLinkFor(memberId))
  })
}

export async function resetPersonalLink(memberId: string) {
  return attempt(async () => {
    const admin = await adminOrThrow()
    return appUrl(await reissuePersonalLink(admin.id, memberId))
  })
}
