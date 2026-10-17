import 'server-only'
import { and, asc, eq, ne, sql } from 'drizzle-orm'
import { db } from '@/db'
import { members, sessions } from '@/db/schema'
import { newToken } from '@/lib/tokens'
import { audit } from './trips'

export type Member = typeof members.$inferSelect

export const MIN_ADMINS = 2

export async function listMembers({ includeInactive = false } = {}) {
  return db
    .select()
    .from(members)
    .where(includeInactive ? undefined : eq(members.isActive, true))
    .orderBy(asc(members.name))
}

export async function getMemberById(id: string): Promise<Member | null> {
  const [m] = await db.select().from(members).where(eq(members.id, id))
  return m ?? null
}

/** E.164-ish: keep a leading +, strip formatting; assume US for 10 digits. */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null
  const digits = input.replace(/[^\d+]/g, '')
  if (/^\+\d{8,15}$/.test(digits)) return digits
  const bare = digits.replace(/\D/g, '')
  if (bare.length === 10) return `+1${bare}`
  if (bare.length === 11 && bare.startsWith('1')) return `+${bare}`
  throw new Error(`"${input}" doesn't look like a phone number`)
}

type ProfileFields = Partial<
  Pick<
    Member,
    | 'name'
    | 'phone'
    | 'emergencyContactName'
    | 'emergencyContactPhone'
    | 'emergencyContactEmail'
    | 'notifyEmail'
    | 'notifySms'
    | 'diet'
  >
>

/** A member editing their own profile. */
export async function updateProfile(memberId: string, patch: ProfileFields) {
  const clean = { ...patch }
  if ('phone' in clean) clean.phone = normalizePhone(clean.phone)
  if ('emergencyContactPhone' in clean) clean.emergencyContactPhone = normalizePhone(clean.emergencyContactPhone)
  if (clean.name !== undefined && !clean.name.trim()) throw new Error('Name is required')
  await db.update(members).set(clean).where(eq(members.id, memberId))
}

async function adminCount(excludingId?: string) {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(members)
    .where(and(eq(members.role, 'admin'), eq(members.isActive, true), excludingId ? ne(members.id, excludingId) : undefined))
  return n
}

export async function addMember(actorId: string, input: { name: string; email: string; phone?: string | null }) {
  const [m] = await db
    .insert(members)
    .values({ name: input.name.trim(), email: input.email.trim().toLowerCase(), phone: normalizePhone(input.phone) })
    .returning()
  await audit(actorId, 'member.add', { memberId: m.id })
  return m
}

export async function adminUpdateMember(
  actorId: string,
  id: string,
  patch: ProfileFields & Partial<Pick<Member, 'email' | 'role' | 'isActive'>>,
) {
  const demoting = patch.role === 'member' || patch.isActive === false
  if (demoting) {
    const target = await getMemberById(id)
    if (target?.role === 'admin' && (await adminCount(id)) < MIN_ADMINS) {
      throw new Error(`ChuckFest needs at least ${MIN_ADMINS} admins.`)
    }
  }
  const clean = { ...patch }
  if (clean.email) clean.email = clean.email.trim().toLowerCase()
  if ('phone' in clean) clean.phone = normalizePhone(clean.phone)
  await db.update(members).set(clean).where(eq(members.id, id))
  if (patch.isActive === false) await db.delete(sessions).where(eq(sessions.userId, id))
  await audit(actorId, 'member.update', { memberId: id, fields: Object.keys(patch) })
}

export const personalLinkPath = (token: string) => `/api/auth/personal-link?token=${token}`

/** A member's personal sign-in link path, creating one if they don't have it yet. */
export async function personalLinkFor(memberId: string): Promise<string> {
  const m = await getMemberById(memberId)
  if (!m) throw new Error('Unknown member')
  if (m.personalLinkToken) return personalLinkPath(m.personalLinkToken)
  const token = newToken()
  await db.update(members).set({ personalLinkToken: token }).where(eq(members.id, memberId))
  return personalLinkPath(token)
}

/** Replace a member's personal link (e.g. if it leaked). The old link stops working. */
export async function reissuePersonalLink(actorId: string, memberId: string): Promise<string> {
  const token = newToken()
  await db.update(members).set({ personalLinkToken: token }).where(eq(members.id, memberId))
  await audit(actorId, 'member.personal_link_reissue', { memberId })
  return personalLinkPath(token)
}
