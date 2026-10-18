import 'server-only'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { magicLink } from 'better-auth/plugins/magic-link'
import { nextCookies } from 'better-auth/next-js'
import { createAuthEndpoint, APIError } from 'better-auth/api'
import { setSessionCookie } from 'better-auth/cookies'
import * as z from 'zod'
import { db } from '@/db'
import { members, sessions, accounts, verifications } from '@/db/schema'
import { sendEmail } from '@/server/notify'
import { magicLinkEmail } from '@/emails/magic-link'
import { siteOrigin, trustedOrigins } from '@/lib/site-url'

const NINETY_DAYS = 60 * 60 * 24 * 90

/**
 * Personal links: each member has a long-lived link (/api/auth/personal-link?token=…)
 * that signs them in on any device. Admins can reissue it, which invalidates the old one.
 */
const personalLink = () => ({
  id: 'personal-link',
  endpoints: {
    personalLinkSignIn: createAuthEndpoint(
      '/personal-link',
      { method: 'GET', query: z.object({ token: z.string().min(20), next: z.string().optional() }) },
      async (ctx) => {
        const next = ctx.query.next?.startsWith('/') ? ctx.query.next : '/'
        const user = await ctx.context.adapter.findOne<{ id: string; isActive: boolean }>({
          model: 'user',
          where: [{ field: 'personalLinkToken', value: ctx.query.token }],
        })
        if (!user || !user.isActive) throw ctx.redirect('/login?error=link')
        const session = await ctx.context.internalAdapter.createSession(user.id)
        if (!session) throw new APIError('INTERNAL_SERVER_ERROR')
        const fullUser = await ctx.context.internalAdapter.findUserById(user.id)
        if (!fullUser) throw ctx.redirect('/login?error=link')
        await setSessionCookie(ctx, { session, user: fullUser })
        throw ctx.redirect(next)
      },
    ),
  },
  rateLimit: [{ pathMatcher: (p: string) => p.startsWith('/personal-link'), window: 60, max: 10 }],
})

export const auth = betterAuth({
  appName: 'ChuckFest',
  baseURL: process.env.BETTER_AUTH_URL ?? siteOrigin(),
  trustedOrigins: trustedOrigins(),
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user: members, session: sessions, account: accounts, verification: verifications },
  }),
  session: { expiresIn: NINETY_DAYS, updateAge: 60 * 60 * 24 },
  user: {
    additionalFields: {
      role: { type: 'string', input: false, defaultValue: 'member' },
      phone: { type: 'string', required: false, input: false },
      isActive: { type: 'boolean', input: false, defaultValue: true },
      personalLinkToken: { type: 'string', required: false, input: false, returned: false },
    },
  },
  plugins: [
    magicLink({
      disableSignUp: true,
      expiresIn: 60 * 30,
      sendMagicLink: async ({ email, url }) => {
        const message = magicLinkEmail(url)
        await sendEmail({
          kind: 'magic_link',
          dedupeKey: `magic_link:${email}:${url}`,
          to: email,
          ...message,
        })
      },
    }),
    personalLink(),
    nextCookies(),
  ],
})

export type Session = typeof auth.$Infer.Session
