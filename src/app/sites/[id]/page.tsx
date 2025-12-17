'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { AppShell } from '@/components/app-shell'

// Dynamic import for the map to avoid SSR issues with Leaflet
const SiteLocationMap = dynamic(
  () => import('@/components/site-location-map').then(mod => ({ default: mod.SiteLocationMap })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-stone-100 flex items-center justify-center rounded-xl">
        <div className="text-stone-500">Loading map...</div>
      </div>
    )
  }
)
import { MemberAvatar } from '@/components/member-avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { getCurrentMemberId } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

interface Member {
  id: string
  name: string
  avatar_url?: string | null
}

interface Comment {
  id: string
  text: string
  created_at: string
  member: Member
}

interface Site {
  id: string
  name: string
  region: string | null
  description: string | null
  latitude: number | null
  longitude: number | null
  distance_miles: number | null
  elevation_gain_ft: number | null
  peak_elevation_ft: number | null
  difficulty: string | null
  permit_required: boolean
  permit_url: string | null
  permit_type: string | null
  permit_notes: string | null
  trail_info_url: string | null
  photos: string[] | null
  vote_count: number
  voters: Member[]
  rank: number | null
  is_tied: boolean
  total_sites: number
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

const MAX_VOTES = 5

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-700 border-green-200',
  moderate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  strenuous: 'bg-red-100 text-red-700 border-red-200',
}

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
  const [imageError, setImageError] = useState(false)

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

  const photoUrl = site.photos && site.photos.length > 0 && !imageError
    ? site.photos[0]
    : null

  const googleMapsUrl = site.latitude && site.longitude
    ? `https://www.google.com/maps?q=${site.latitude},${site.longitude}`
    : null

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

        {/* HEADER SECTION */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">{site.name}</h1>
              {site.region && (
                <p className="text-lg text-stone-600 mt-1">{site.region}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              {/* Vote count and button */}
              <div className="flex items-center gap-4">
                <span className="text-lg font-bold text-emerald-700">
                  {site.vote_count} vote{site.vote_count !== 1 ? 's' : ''}
                </span>
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
              {/* Rank - only show if has votes */}
              {site.vote_count > 0 && site.rank !== null && (
                <span className="text-sm text-stone-500">
                  Ranked #{site.rank}{site.is_tied ? ' (tied)' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Voters line */}
          {site.voters.length > 0 ? (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-stone-500">Voted by:</span>
              <div className="flex items-center gap-1">
                {site.voters.slice(0, 6).map((voter, index) => (
                  <div key={voter.id} className="flex items-center">
                    <MemberAvatar name={voter.name} size="xs" />
                    <span className="text-sm text-stone-700 ml-1">
                      {voter.name}{index < Math.min(site.voters.length, 6) - 1 ? ',' : ''}
                    </span>
                  </div>
                ))}
                {site.voters.length > 6 && (
                  <span className="text-sm text-stone-500 ml-1">
                    +{site.voters.length - 6} more
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-stone-400">No votes yet</p>
          )}
        </div>

        {/* HERO IMAGE */}
        <div className="mb-8 rounded-xl overflow-hidden bg-gradient-to-br from-stone-100 to-stone-200 h-[300px] sm:h-[400px]">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={site.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center text-stone-400">
                <svg className="w-20 h-20 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">No photo available</p>
              </div>
            </div>
          )}
        </div>

        {/* STATS BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {site.distance_miles !== null && (
            <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
              <div className="text-2xl mb-1">📍</div>
              <div className="text-xl font-bold text-stone-800">{site.distance_miles}</div>
              <div className="text-sm text-stone-500">miles (one-way)</div>
            </div>
          )}
          {site.elevation_gain_ft !== null && (
            <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
              <div className="text-2xl mb-1">⬆️</div>
              <div className="text-xl font-bold text-stone-800">{site.elevation_gain_ft.toLocaleString()}</div>
              <div className="text-sm text-stone-500">ft elevation gain</div>
            </div>
          )}
          {site.peak_elevation_ft !== null && (
            <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
              <div className="text-2xl mb-1">⛺</div>
              <div className="text-xl font-bold text-stone-800">{site.peak_elevation_ft.toLocaleString()}</div>
              <div className="text-sm text-stone-500">ft camp elevation</div>
            </div>
          )}
          {site.difficulty && (
            <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
              <div className="text-2xl mb-1">🏔️</div>
              <Badge
                variant="outline"
                className={cn(
                  'text-sm capitalize px-3 py-1',
                  difficultyColors[site.difficulty.toLowerCase()] || 'bg-stone-100 text-stone-600'
                )}
              >
                {site.difficulty}
              </Badge>
              <div className="text-sm text-stone-500 mt-1">difficulty</div>
            </div>
          )}
        </div>

        {/* LOCATION MAP */}
        {site.latitude && site.longitude && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] rounded-xl overflow-hidden">
                <SiteLocationMap
                  latitude={site.latitude}
                  longitude={site.longitude}
                  name={site.name}
                />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-stone-500">
                  {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}
                </span>
                {googleMapsUrl && (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-emerald-700 hover:underline"
                  >
                    Open in Google Maps
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6">
          {/* DESCRIPTION CARD */}
          {site.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About this Site</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">
                  {site.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* DETAILS CARD */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                {site.latitude && site.longitude && (
                  <div>
                    <span className="text-sm font-medium text-stone-500 block mb-1">
                      Coordinates
                    </span>
                    <a
                      href={googleMapsUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 hover:underline"
                    >
                      {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}
                    </a>
                  </div>
                )}
                {site.permit_type && (
                  <div>
                    <span className="text-sm font-medium text-stone-500 block mb-1">
                      Permit Type
                    </span>
                    <p className="text-stone-700 capitalize">{site.permit_type.replace('_', ' ')}</p>
                  </div>
                )}
                {site.permit_required && (
                  <div>
                    <span className="text-sm font-medium text-stone-500 block mb-1">
                      Permit Required
                    </span>
                    <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                      Yes - Permit Required
                    </Badge>
                  </div>
                )}
                {site.permit_notes && (
                  <div className="sm:col-span-2">
                    <span className="text-sm font-medium text-stone-500 block mb-1">
                      Permit Notes
                    </span>
                    <p className="text-stone-700">{site.permit_notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* LINKS CARD */}
          {(site.trail_info_url || site.permit_url || googleMapsUrl) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Links</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {site.trail_info_url && (
                    <a
                      href={site.trail_info_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        variant="outline"
                        className="text-green-700 border-green-300 hover:bg-green-50"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        AllTrails
                        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </Button>
                    </a>
                  )}
                  {site.permit_url && (
                    <a
                      href={site.permit_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        variant="outline"
                        className="text-blue-700 border-blue-300 hover:bg-blue-50"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Permits / Recreation.gov
                        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </Button>
                    </a>
                  )}
                  {googleMapsUrl && (
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        variant="outline"
                        className="text-stone-700 border-stone-300 hover:bg-stone-50"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Google Maps
                        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* COMMENTS */}
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
              <form onSubmit={handleAddComment} className="mt-6 space-y-3 pt-4 border-t border-stone-100">
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
