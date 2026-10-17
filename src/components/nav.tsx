'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, History, House, MapPinned, Tent } from 'lucide-react'
import { cn } from './ui'

const TABS = [
  { href: '/', label: 'Home', icon: House },
  { href: '/dates', label: 'Dates', icon: CalendarDays },
  { href: '/sites', label: 'Sites', icon: MapPinned },
  { href: '/trip', label: 'Trip', icon: Tent },
  { href: '/history', label: 'History', icon: History },
] as const

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
}

export function TopNav() {
  const pathname = usePathname()
  return (
    <nav className="hidden items-center gap-1 sm:flex">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            'rounded-lg px-3 py-2 text-sm font-semibold',
            isActive(pathname, t.href) ? 'bg-pine-soft text-pine' : 'text-muted hover:text-ink',
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  )
}

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-[1000] border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      <ul className="grid grid-cols-5">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href)
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn('flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold', active ? 'text-pine' : 'text-muted')}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
