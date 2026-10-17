import { redirect } from 'next/navigation'
import { getMember } from '@/server/session'
import { LoginForm } from './login-form'

export const metadata = { title: 'Sign in' }

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const params = await searchParams
  const next = typeof params.next === 'string' && params.next.startsWith('/') ? params.next : '/'
  if (await getMember()) redirect(next)
  const error = typeof params.error === 'string' ? params.error : undefined

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Est. 2020</p>
      <h1 className="mt-1 text-4xl font-semibold">ChuckFest</h1>
      <p className="mt-2 text-[15px] text-muted">Enter your email and we&apos;ll send you a sign-in link.</p>
      {error && (
        <p className="mt-4 rounded-lg bg-ember-soft px-3 py-2 text-sm text-ember">
          {error === 'link' ? 'That personal link is no longer valid. Ask an admin for a new one, or use email below.' : 'That sign-in link has expired or was already used. Request a new one.'}
        </p>
      )}
      <LoginForm next={next} />
    </main>
  )
}
