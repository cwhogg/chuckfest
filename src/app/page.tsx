'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MemberAvatar } from '@/components/member-avatar'
import { setCurrentMember } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Member {
  id: string
  name: string
  email: string
  phone: string | null
  is_active: boolean
}

export default function Home() {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newMember, setNewMember] = useState({ name: '', email: '', phone: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/members')
      const data = await res.json()
      if (data.success) {
        // Only show active members
        setMembers(data.members.filter((m: Member) => m.is_active))
      }
    } catch (err) {
      console.error('Failed to fetch members:', err)
    } finally {
      setLoading(false)
    }
  }

  const selectMember = (memberId: string) => {
    setCurrentMember(memberId)
    router.push('/sites')
  }

  const handleAddMember = async () => {
    if (!newMember.name || !newMember.email) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember),
      })
      const data = await res.json()

      if (data.success) {
        // Auto-select the new member and redirect
        setCurrentMember(data.member.id)
        router.push('/sites')
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to add member')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#faf6f0] relative overflow-hidden">
      {/* Topographic pattern overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 10 Q70 30 50 50 T50 90' stroke='%235c4033' stroke-width='0.5' fill='none'/%3E%3Cpath d='M20 20 Q40 40 20 60 T20 100' stroke='%235c4033' stroke-width='0.5' fill='none'/%3E%3Cpath d='M80 0 Q100 20 80 40 T80 80' stroke='%235c4033' stroke-width='0.5' fill='none'/%3E%3C/svg%3E")`,
          backgroundSize: '100px 100px',
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        {/* Logo and Title */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            {/* Mountain icon */}
            <svg
              className="w-16 h-16 text-[#2d5016]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2L2 22h20L12 2zm0 4.5l6.5 13h-13l6.5-13z" opacity="0.3"/>
              <path d="M12 2L2 22h20L12 2zm0 3l7.5 15h-15L12 5z"/>
              <path d="M7 14l3-4 2 2 4-5 4 7H4l3-4z" fill="white" opacity="0.5"/>
            </svg>
          </div>
          <h1 className="text-5xl font-bold text-[#2d5016] tracking-tight mb-2">
            ChuckfestAI
          </h1>
          <p className="text-xl text-[#5c4033]">
            Are you joining the adventure?
          </p>
        </div>

        {/* Member Grid */}
        {loading ? (
          <div className="text-[#7a7067]">Loading...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 max-w-3xl mb-12">
            {members.map((member) => (
              <button
                key={member.id}
                onClick={() => selectMember(member.id)}
                className="group flex flex-col items-center p-4 rounded-xl transition-all duration-200 hover:bg-[#fffdf9] hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#2d5016] focus:ring-offset-2"
              >
                <MemberAvatar
                  name={member.name}
                  size="xl"
                  className="mb-3 ring-4 ring-[#fffdf9] shadow-md group-hover:ring-[#e8dcc8] transition-all"
                />
                <span className="text-[#3d352e] font-medium text-center">
                  {member.name}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* New member link */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <button className="text-[#2d5016] hover:text-[#5c4033] underline underline-offset-4 font-medium transition-colors">
              I&apos;m new here
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Welcome to Chuckfest!</DialogTitle>
              <DialogDescription>
                Add yourself to the crew. You&apos;ll receive permit reminder emails at the address you provide.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {error && (
                <div className="text-sm text-[#b54c3a] bg-[#fdf2f0] p-3 rounded-lg">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  placeholder="555-123-4567"
                  value={newMember.phone}
                  onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddMember}
                disabled={!newMember.name || !newMember.email || submitting}
                className="bg-[#5c4033] hover:bg-[#4a3429]"
              >
                {submitting ? 'Joining...' : 'Join the Crew'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Footer */}
        <div className="absolute bottom-6 text-center text-[#7a7067] text-sm">
          Annual backpacking adventure since 2020
        </div>
      </div>
    </div>
  )
}
