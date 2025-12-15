import { cookies } from 'next/headers'
import { supabase } from './supabase'
import type { Member } from './types'

const COOKIE_NAME = 'chuckfest_member_id'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

/**
 * Server-side: Get the current member from the cookie
 */
export async function getCurrentMember(): Promise<Member | null> {
  try {
    const cookieStore = await cookies()
    const memberId = cookieStore.get(COOKIE_NAME)?.value

    if (!memberId) {
      return null
    }

    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single()

    if (error || !data) {
      return null
    }

    return data as Member
  } catch {
    return null
  }
}

/**
 * Server-side: Set the current member cookie
 */
export async function setCurrentMemberServer(memberId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, memberId, {
    httpOnly: false, // Allow client-side access
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

/**
 * Server-side: Clear the current member cookie
 */
export async function clearCurrentMemberServer(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

/**
 * Get just the member ID from cookie (doesn't fetch from DB)
 */
export async function getCurrentMemberId(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    return cookieStore.get(COOKIE_NAME)?.value || null
  } catch {
    return null
  }
}
