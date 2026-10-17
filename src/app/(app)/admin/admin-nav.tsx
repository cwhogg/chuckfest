'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/components/ui'

const LINKS = [
  ['/admin', 'Trip'],
  ['/admin/dates', 'Dates'],
  ['/admin/site', 'Site'],
  ['/admin/logistics', 'Logistics'],
  ['/admin/members', 'Members'],
  ['/admin/sites', 'Sites'],
  ['/admin/ideas', 'Ideas'],
  ['/admin/history', 'History'],
  ['/admin/messages', 'Messages'],
] as const

export function AdminNav() {
  const pathname = usePathname()
  return (
    <nav className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-1 border-b border-line">
        {LINKS.map(([href, label]) => {
          const active = href === '/admin' ? pathname === href : pathname.startsWith(href)
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn('block whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold', active ? 'border-lake text-lake' : 'border-transparent text-muted hover:text-ink')}
              >
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
