import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { media } from '@/db/schema'
import { getMember } from '@/server/session'

/** Private images stored in the database, for signed-in members only. */
export async function GET(_req: Request, ctx: RouteContext<'/media/[name]'>) {
  if (!(await getMember())) return new Response('Sign in to see this', { status: 401 })
  const { name } = await ctx.params
  const [row] = await db.select().from(media).where(eq(media.name, name))
  if (!row) return new Response('Not found', { status: 404 })
  return new Response(Buffer.from(row.dataBase64, 'base64'), {
    headers: { 'Content-Type': row.contentType, 'Cache-Control': 'private, max-age=86400' },
  })
}
