import 'server-only'
import { cache } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export type CurrentMember = {
  id: string
  name: string
  email: string
  role: 'admin' | 'member'
}

/** The signed-in, active member for this request, or null. Cached per request. */
export const getMember = cache(async (): Promise<CurrentMember | null> => {
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user || user.isActive === false) return null
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role === 'admin' ? 'admin' : 'member',
  }
})

/** For pages: redirect to /login when signed out. */
export async function requireMember(): Promise<CurrentMember> {
  const member = await getMember()
  if (!member) redirect('/login')
  return member
}

/** For admin pages: members are sent home. */
export async function requireAdmin(): Promise<CurrentMember> {
  const member = await requireMember()
  if (member.role !== 'admin') redirect('/')
  return member
}

/** For server actions: throw instead of redirecting. */
export async function memberOrThrow(): Promise<CurrentMember> {
  const member = await getMember()
  if (!member) throw new Error('Not signed in')
  return member
}

export async function adminOrThrow(): Promise<CurrentMember> {
  const member = await memberOrThrow()
  if (member.role !== 'admin') throw new Error('Admins only')
  return member
}
