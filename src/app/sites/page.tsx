'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { AppShell } from '@/components/app-shell'
import { SiteCard } from '@/components/site-card'
import { Button } from '@/components/ui/button'
import { getCurrentMemberId } from '@/lib/auth-client'

// Dynamic import for the map to avoid SSR issues with Leaflet
const SitesMap = dynamic(
  () => import('@/components/sites-map').then(mod => ({ default: mod.SitesMap })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-stone-100 flex items-center justify-center">
        <div className="text-stone-500">Loading map...</div>
      </div>
    )
  }
)

interface Site {
  id: string
  name: string
  location: string | null
  latitude: number | null
  longitude: number | null
  permit_required: boolean
  vote_count: number
}

interface Vote {
  id: string
  site_id: string
  member_id: string
}

interface TripYear {
  id: string
  year: number
  status: string
}

const MAX_VOTES = 3

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [myVotes, setMyVotes] = useState<Vote[]>([])
  const [tripYear, setTripYear] = useState<TripYear | null>(null)
  const [memberId, setMemberId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)
  const [view, setView] = useState<'list' | 'map'>('list')

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const currentMemberId = getCurrentMemberId()
      setMemberId(currentMemberId)

      // Fetch current trip year
      const tripYearRes = await fetch('/api/trip-years?current=true')
      const tripYearData = await tripYearRes.json()
      const currentTripYear = tripYearData.tripYear
      setTripYear(currentTripYear)

      // Fetch sites with vote counts
      const sitesUrl = currentTripYear
        ? `/api/sites?tripYearId=${currentTripYear.id}`
        : '/api/sites'
      const sitesRes = await fetch(sitesUrl)
      const sitesData = await sitesRes.json()
      setSites(sitesData.sites || [])

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
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleVote = async (siteId: string) => {
    if (!memberId || !tripYear) return
    if (myVotes.length >= MAX_VOTES) return

    // Optimistic update
    const optimisticVote: Vote = {
      id: 'temp-' + Date.now(),
      site_id: siteId,
      member_id: memberId
    }
    setMyVotes(prev => [...prev, optimisticVote])
    setSites(prev =>
      prev.map(s =>
        s.id === siteId ? { ...s, vote_count: s.vote_count + 1 } : s
      )
    )

    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          siteId,
          tripYearId: tripYear.id
        })
      })

      if (!res.ok) {
        throw new Error('Failed to vote')
      }

      const data = await res.json()

      // Update with real vote ID
      setMyVotes(prev =>
        prev.map(v =>
          v.id === optimisticVote.id ? { ...v, id: data.vote.id } : v
        )
      )
    } catch (error) {
      console.error('Error voting:', error)
      // Rollback
      setMyVotes(prev => prev.filter(v => v.id !== optimisticVote.id))
      setSites(prev =>
        prev.map(s =>
          s.id === siteId ? { ...s, vote_count: s.vote_count - 1 } : s
        )
      )
    }
  }

  const handleUnvote = async (siteId: string) => {
    const vote = myVotes.find(v => v.site_id === siteId)
    if (!vote) return

    // Optimistic update
    setMyVotes(prev => prev.filter(v => v.id !== vote.id))
    setSites(prev =>
      prev.map(s =>
        s.id === siteId ? { ...s, vote_count: Math.max(0, s.vote_count - 1) } : s
      )
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
      // Rollback
      setMyVotes(prev => [...prev, vote])
      setSites(prev =>
        prev.map(s =>
          s.id === siteId ? { ...s, vote_count: s.vote_count + 1 } : s
        )
      )
    }
  }

  const votedSiteIds = new Set(myVotes.map(v => v.site_id))
  const canVote = myVotes.length < MAX_VOTES

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-stone-500">Loading sites...</div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-stone-200 bg-white">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-stone-900">
                {tripYear ? `Sites for ${tripYear.year}` : 'Sites'}
              </h1>
              <p className="text-sm text-stone-600">
                {myVotes.length} of {MAX_VOTES} votes used
              </p>
            </div>
            {/* Mobile view toggle */}
            <div className="flex md:hidden gap-2">
              <Button
                variant={view === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('list')}
              >
                List
              </Button>
              <Button
                variant={view === 'map' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('map')}
              >
                Map
              </Button>
            </div>
          </div>
        </div>

        {/* Main content - split view */}
        <div className="flex-1 flex overflow-hidden">
          {/* List view */}
          <div
            className={`
              ${view === 'list' ? 'flex' : 'hidden'}
              md:flex md:w-2/5 flex-col overflow-hidden border-r border-stone-200
            `}
          >
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {sites.length === 0 ? (
                <div className="text-center py-12 text-stone-500">
                  No sites available yet.
                </div>
              ) : (
                sites.map(site => (
                  <SiteCard
                    key={site.id}
                    site={site}
                    isVoted={votedSiteIds.has(site.id)}
                    canVote={canVote}
                    onVote={() => handleVote(site.id)}
                    onUnvote={() => handleUnvote(site.id)}
                    isSelected={selectedSiteId === site.id}
                    onSelect={() => setSelectedSiteId(site.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Map view */}
          <div
            className={`
              ${view === 'map' ? 'flex' : 'hidden'}
              md:flex md:w-3/5 flex-col
            `}
          >
            <SitesMap
              sites={sites}
              selectedSiteId={selectedSiteId}
              onSiteSelect={setSelectedSiteId}
            />
          </div>
        </div>
      </div>
    </AppShell>
  )
}
