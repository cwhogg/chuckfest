'use client'

import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { Button, Field, inputClass } from '@/components/ui'

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('sending')
    const { error } = await authClient.signIn.magicLink({
      email: email.trim().toLowerCase(),
      callbackURL: next,
      errorCallbackURL: '/login?error=expired',
    })
    // Don't reveal whether an email is on the roster.
    setState(error && error.status !== 400 && error.status !== 404 ? 'error' : 'sent')
  }

  if (state === 'sent') {
    return (
      <div className="mt-6 rounded-xl border border-line bg-card p-5">
        <p className="font-semibold text-pine">Check your email</p>
        <p className="mt-1 text-sm text-muted">
          If {email} is on the ChuckFest roster, a sign-in link is on its way. It expires in 30 minutes.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <Field label="Email">
        <input
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </Field>
      <Button type="submit" className="w-full" disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
      </Button>
      {state === 'error' && <p className="text-sm text-ember">Something went wrong. Try again in a minute.</p>}
    </form>
  )
}
