import Cookies from 'js-cookie'

const COOKIE_NAME = 'chuckfest_member_id'

/**
 * Client-side: Set the current member cookie
 */
export function setCurrentMember(memberId: string): void {
  Cookies.set(COOKIE_NAME, memberId, {
    expires: 365, // days
    sameSite: 'lax',
    path: '/',
  })
}

/**
 * Client-side: Get the current member ID from cookie
 */
export function getCurrentMemberId(): string | null {
  return Cookies.get(COOKIE_NAME) || null
}

/**
 * Client-side: Clear the current member cookie
 */
export function clearCurrentMember(): void {
  Cookies.remove(COOKIE_NAME, { path: '/' })
}
