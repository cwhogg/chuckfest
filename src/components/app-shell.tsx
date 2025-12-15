'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { MemberAvatar } from './member-avatar'
import { clearCurrentMember, getCurrentMemberId } from '@/lib/auth-client'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet'

interface Member {
  id: string
  name: string
  email: string
}

interface TripYear {
  year: number
}

const navLinks = [
  { href: '/sites', label: 'Sites' },
  { href: '/dates', label: 'Dates' },
  { href: '/past-trips', label: 'Past Trips' },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [member, setMember] = useState<Member | null>(null)
  const [tripYear, setTripYear] = useState<TripYear | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    // Fetch current member
    const memberId = getCurrentMemberId()
    if (memberId) {
      fetch(`/api/members/${memberId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setMember(data.member)
          }
        })
        .catch(console.error)
    }

    // Fetch current trip year
    fetch('/api/trip-years?current=true')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.tripYear) {
          setTripYear(data.tripYear)
        }
      })
      .catch(console.error)
  }, [])

  const handleSwitchMember = () => {
    clearCurrentMember()
    router.push('/')
  }

  const isActive = (href: string) => pathname === href

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/sites" className="flex items-center gap-2">
              <svg
                className="w-8 h-8 text-emerald-700"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2L2 22h20L12 2zm0 3l7.5 15h-15L12 5z"/>
              </svg>
              <span className="text-xl font-bold text-emerald-800 hidden sm:block">
                ChuckfestAI
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right Side - Member Avatar */}
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="md:hidden">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    </svg>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-2 mt-6">
                    {navLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                          isActive(link.href)
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        {link.label}
                      </Link>
                    ))}
                    <div className="border-t border-stone-200 my-4" />
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-4 py-3 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-100"
                    >
                      Admin
                    </Link>
                  </nav>
                </SheetContent>
              </Sheet>

              {/* Member Dropdown */}
              {member && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 rounded-full">
                      <MemberAvatar name={member.name} size="sm" />
                      <span className="text-sm font-medium text-stone-700 hidden sm:block">
                        {member.name}
                      </span>
                      <svg
                        className="w-4 h-4 text-stone-400 hidden sm:block"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="px-2 py-1.5 text-sm text-stone-500">
                      Signed in as <span className="font-medium text-stone-700">{member.name}</span>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSwitchMember}>
                      Switch Member
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin">Admin</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-stone-500">
            {tripYear ? `Chuckfest ${tripYear.year}` : 'Chuckfest'} &bull; Annual backpacking adventure
          </p>
        </div>
      </footer>
    </div>
  )
}
