import Link from 'next/link'
import { Shield } from 'lucide-react'
import { requireMember } from '@/server/session'
import { BottomNav, TopNav } from '@/components/nav'

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const member = await requireMember()
  const initials = member.name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="min-h-dvh pb-20 sm:pb-0">
      <header className="sticky top-0 z-[1000] border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <Link href="/" className="font-display text-xl font-semibold text-bark">
            ChuckFest
          </Link>
          <TopNav />
          <div className="flex items-center gap-2">
            {member.role === 'admin' && (
              <Link href="/admin" className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-lake hover:bg-lake-soft">
                <Shield size={16} /> Admin
              </Link>
            )}
            <Link
              href="/me"
              aria-label="Your profile"
              className="grid h-9 w-9 place-items-center rounded-full bg-bark text-sm font-semibold text-card"
            >
              {initials}
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-5 sm:py-8">{children}</main>
      <BottomNav />
    </div>
  )
}
