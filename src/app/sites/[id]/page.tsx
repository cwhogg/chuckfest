'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { MemberAvatar } from '@/components/member-avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { getCurrentMemberId } from '@/lib/auth-client'

interface Member {
  id: string
  name: string
}

interface Comment {
  id: string
  text: string
  created_at: string
  member: Member
}

interface Voter {
  id: string
  member: Member
}

interface Site {
  id: string
  name: string
  location: string | null
  latitude: number | null
  longitude: number | null
  permit_required: boolean
  permit_url: string | null
  permit_open_date: string | null
  notes: string | null
  vote_count: number
  voters: Voter[]
  comments: Comment[]
}

interface TripYear {
  id: string
  year: number
  status: string
}

interface Vote {
  id: string
  site_id: string
  member_id: string
}

const MAX_VOTES = 3

export default function SiteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const siteId = params.id as string

  const [site, setSite] = useState<Site | null>(null)
  const [tripYear, setTripYear] = useState<TripYear | null>(null)
  const [memberId, setMemberId] = useState<string | null>(null)
  const [myVotes, setMyVotes] = useState<Vote[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const currentMemberId = getCurrentMemberId()
      setMemberId(currentMemberId)

      // Fetch current trip year
      const tripYearRes = await fetch('/api/trip-years?current=true')
      const tripYearData = await tripYearRes.json()
      const currentTripYear = tripYearData.tripYear
      setTripYear(currentTripYear)

      // Fetch site details
      const siteUrl = currentTripYear
        ? `/api/sites/${siteId}?tripYearId=${currentTripYear.id}`
        : `/api/sites/${siteId}`
      const siteRes = await fetch(siteUrl)
      const siteData = await siteRes.json()

      if (!siteData.success) {
        router.push('/sites')
        return
      }

      setSite(siteData.site)

      // Fetch user's votes
      if (currentMemberId && currentTripYear) {
        const votesRes = await fetch(
          `/api/votes?memberId=${currentMemberId}&tripYearId=${currentTripYear.id}`
        )
        const votesData = await votesRes.json()
        setMyVotes(votesData.votes || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [siteId, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleVote = async () => {
    if (!memberId || !tripYear || !site) return
    if (myVotes.length >= MAX_VOTES) return

    // Optimistic update
    const optimisticVote: Vote = {
      id: 'temp-' + Date.now(),
      site_id: site.id,
      member_id: memberId
    }
    setMyVotes(prev => [...prev, optimisticVote])
    setSite(prev =>
      prev ? { ...prev, vote_count: prev.vote_count + 1 } : prev
    )

    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          siteId: site.id,
          tripYearId: tripYear.id
        })
      })

      if (!res.ok) {
        throw new Error('Failed to vote')
      }

      const data = await res.json()
      setMyVotes(prev =>
        prev.map(v =>
          v.id === optimisticVote.id ? { ...v, id: data.vote.id } : v
        )
      )
    } catch (error) {
      console.error('Error voting:', error)
      setMyVotes(prev => prev.filter(v => v.id !== optimisticVote.id))
      setSite(prev =>
        prev ? { ...prev, vote_count: prev.vote_count - 1 } : prev
      )
    }
  }

  const handleUnvote = async () => {
    if (!site) return
    const vote = myVotes.find(v => v.site_id === site.id)
    if (!vote) return

    // Optimistic update
    setMyVotes(prev => prev.filter(v => v.id !== vote.id))
    setSite(prev =>
      prev ? { ...prev, vote_count: Math.max(0, prev.vote_count - 1) } : prev
    )

    try {
      const res = await fetch(`/api/votes/${vote.id}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        throw new Error('Failed to remove vote')
      }
    } catch (error) {
      console.error('Error removing vote:', error)
      setMyVotes(prev => [...prev, vote])
      setSite(prev =>
        prev ? { ...prev, vote_count: prev.vote_count + 1 } : prev
      )
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!memberId || !site || !newComment.trim()) return

    setSubmittingComment(true)

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          siteId: site.id,
          text: newComment.trim()
        })
      })

      if (!res.ok) {
        throw new Error('Failed to add comment')
      }

      const data = await res.json()
      setSite(prev =>
        prev
          ? { ...prev, comments: [...prev.comments, data.comment] }
          : prev
      )
      setNewComment('')
    } catch (error) {
      console.error('Error adding comment:', error)
    } finally {
      setSubmittingComment(false)
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-stone-500">Loading site...</div>
        </div>
      </AppShell>
    )
  }

  if (!site) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-stone-500">Site not found</div>
        </div>
      </AppShell>
    )
  }

  const hasVoted = myVotes.some(v => v.site_id === site.id)
  const canVote = myVotes.length < MAX_VOTES

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          href="/sites"
          className="inline-flex items-center text-sm text-stone-600 hover:text-emerald-700 mb-6"
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Sites
        </Link>

        {/* Site header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-stone-900">{site.name}</h1>
              {site.location && (
                <p className="text-stone-600 mt-1">{site.location}</p>
              )}
              <div className="flex items-center gap-3 mt-3">
                {site.permit_required && (
                  <Badge variant="outline">Permit Required</Badge>
                )}
                <span className="text-sm text-stone-500">
                  {site.vote_count} vote{site.vote_count !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <div>
              {hasVoted ? (
                <Button
                  variant="outline"
                  onClick={handleUnvote}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Remove Vote
                </Button>
              ) : (
                <Button
                  onClick={handleVote}
                  disabled={!canVote}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Vote for this Site
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Site details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {site.latitude && site.longitude && (
                <div>
                  <span className="text-sm font-medium text-stone-700">
                    Coordinates:
                  </span>
                  <p className="text-stone-600">
                    {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}
                  </p>
                </div>
              )}
              {site.permit_url && (
                <div>
                  <span className="text-sm font-medium text-stone-700">
                    Permit Info:
                  </span>
                  <p>
                    <a
                      href={site.permit_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 hover:underline"
                    >
                      View permit details
                    </a>
                  </p>
                </div>
              )}
              {site.permit_open_date && (
                <div>
                  <span className="text-sm font-medium text-stone-700">
                    Permit Opens:
                  </span>
                  <p className="text-stone-600">
                    {new Date(site.permit_open_date).toLocaleDateString()}
                  </p>
                </div>
              )}
              {site.notes && (
                <div>
                  <span className="text-sm font-medium text-stone-700">
                    Notes:
                  </span>
                  <p className="text-stone-600 whitespace-pre-wrap">
                    {site.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Voters */}
          {site.voters.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Who&apos;s Voted ({site.voters.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {site.voters.map(voter => (
                    <div
                      key={voter.id}
                      className="flex items-center gap-2 px-3 py-2 bg-stone-50 rounded-full"
                    >
                      <MemberAvatar name={voter.member.name} size="sm" />
                      <span className="text-sm text-stone-700">
                        {voter.member.name}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Comments ({site.comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {site.comments.length === 0 ? (
                <p className="text-stone-500 text-sm">
                  No comments yet. Be the first to share your thoughts!
                </p>
              ) : (
                <div className="space-y-4">
                  {site.comments.map(comment => (
                    <div key={comment.id} className="flex gap-3">
                      <MemberAvatar name={comment.member.name} size="sm" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-stone-900">
                            {comment.member.name}
                          </span>
                          <span className="text-xs text-stone-500">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-stone-700 mt-1 whitespace-pre-wrap">
                          {comment.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add comment form */}
              <form onSubmit={handleAddComment} className="mt-6 space-y-3">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={!newComment.trim() || submittingComment}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {submittingComment ? 'Posting...' : 'Post Comment'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
