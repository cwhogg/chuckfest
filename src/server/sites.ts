import 'server-only'
import { and, asc, desc, eq, isNotNull } from 'drizzle-orm'
import { db } from '@/db'
import { comments, hikeIdeas, members, pastTrips, sites } from '@/db/schema'
import { audit } from './trips'

export type Site = typeof sites.$inferSelect
export type SiteInput = Omit<typeof sites.$inferInsert, 'id' | 'createdAt' | 'updatedAt' | 'legacyId'>

export async function listSites({ includeArchived = false } = {}) {
  return db
    .select()
    .from(sites)
    .where(includeArchived ? undefined : eq(sites.status, 'active'))
    .orderBy(desc(sites.totalScore), asc(sites.name))
}

export async function getSite(id: string): Promise<Site | null> {
  const [site] = await db.select().from(sites).where(eq(sites.id, id))
  return site ?? null
}

/** Total score is always derived from its four parts when they're all present. */
function withTotal<T extends Partial<SiteInput>>(input: T): T {
  const parts = [input.sceneryScore, input.experienceScore, input.accessScore, input.permitScore]
  if (parts.every((p) => typeof p === 'number')) return { ...input, totalScore: parts.reduce((a, b) => a! + b!, 0) }
  return input
}

export async function createSite(actorId: string, input: SiteInput) {
  const [site] = await db.insert(sites).values(withTotal(input)).returning()
  await audit(actorId, 'site.create', { siteId: site.id, name: site.name })
  return site
}

export async function updateSite(actorId: string, id: string, patch: Partial<SiteInput>) {
  await db.update(sites).set(withTotal(patch)).where(eq(sites.id, id))
  await audit(actorId, 'site.update', { siteId: id, fields: Object.keys(patch) })
}

/** Past ChuckFest trips that went to this site. */
export async function visitsToSite(siteId: string) {
  return db.select({ year: pastTrips.year }).from(pastTrips).where(eq(pastTrips.siteId, siteId)).orderBy(desc(pastTrips.year))
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export async function addComment(memberId: string, target: { siteId?: string; tripYearId?: string }, body: string) {
  const text = body.trim().slice(0, 2000)
  if (!text) throw new Error('Comment is empty')
  if (!target.siteId && !target.tripYearId) throw new Error('Nothing to comment on')
  await db.insert(comments).values({ memberId, body: text, siteId: target.siteId ?? null, tripYearId: target.tripYearId ?? null })
}

export async function listComments(target: { siteId?: string; tripYearId?: string }) {
  const where = target.siteId ? eq(comments.siteId, target.siteId) : eq(comments.tripYearId, target.tripYearId!)
  return db
    .select({ id: comments.id, body: comments.body, createdAt: comments.createdAt, memberId: comments.memberId, name: members.name })
    .from(comments)
    .innerJoin(members, eq(members.id, comments.memberId))
    .where(where)
    .orderBy(asc(comments.createdAt))
}

export async function deleteComment(actor: { id: string; role: string }, commentId: string) {
  const [c] = await db.select().from(comments).where(eq(comments.id, commentId))
  if (!c) return
  if (c.memberId !== actor.id && actor.role !== 'admin') throw new Error('You can only delete your own comments')
  await db.delete(comments).where(eq(comments.id, commentId))
}

// ---------------------------------------------------------------------------
// Hike ideas
// ---------------------------------------------------------------------------

export async function submitIdea(memberId: string, input: { name: string; link?: string | null; notes?: string | null }) {
  const name = input.name.trim().slice(0, 200)
  if (!name) throw new Error('Give the hike a name')
  const link = input.link?.trim() || null
  if (link && !/^https?:\/\//.test(link)) throw new Error('Links must start with http:// or https://')
  const [idea] = await db
    .insert(hikeIdeas)
    .values({ memberId, name, link, notes: input.notes?.trim().slice(0, 2000) || null })
    .returning()
  return idea
}

export async function listIdeas(status?: 'new' | 'approved' | 'declined') {
  return db
    .select({ idea: hikeIdeas, submittedBy: members.name })
    .from(hikeIdeas)
    .leftJoin(members, eq(members.id, hikeIdeas.memberId))
    .where(status ? eq(hikeIdeas.status, status) : undefined)
    .orderBy(desc(hikeIdeas.createdAt))
}

export async function declineIdea(actorId: string, ideaId: string) {
  await db
    .update(hikeIdeas)
    .set({ status: 'declined', reviewedById: actorId, reviewedAt: new Date() })
    .where(eq(hikeIdeas.id, ideaId))
  await audit(actorId, 'idea.decline', { ideaId })
}

/** Approve an idea by creating a site from the reviewed fields. */
export async function approveIdea(actorId: string, ideaId: string, siteInput: SiteInput) {
  const [idea] = await db.select().from(hikeIdeas).where(and(eq(hikeIdeas.id, ideaId), eq(hikeIdeas.status, 'new')))
  if (!idea) throw new Error('Idea not found or already reviewed')
  const site = await createSite(actorId, siteInput)
  await db
    .update(hikeIdeas)
    .set({ status: 'approved', siteId: site.id, reviewedById: actorId, reviewedAt: new Date() })
    .where(eq(hikeIdeas.id, ideaId))
  return site
}

export async function sitesWithCoordinates() {
  return db.select().from(sites).where(and(eq(sites.status, 'active'), isNotNull(sites.latitude), isNotNull(sites.longitude)))
}
