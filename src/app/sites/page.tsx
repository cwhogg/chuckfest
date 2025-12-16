'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import { AppShell } from '@/components/app-shell'
import { SiteCard } from '@/components/site-card'
import { AddSiteModal } from '@/components/add-site-modal'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getCurrentMemberId } from '@/lib/auth-client'
import { toast } from 'sonner'

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
  vote_count: number
  photos?: string[] | null
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

type SortOption = 'votes' | 'name' | 'distance' | 'elevation'
type DifficultyFilter = 'all' | 'easy' | 'moderate' | 'strenuous'

const MAX_VOTES = 5

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [myVotes, setMyVotes] = useState<Vote[]>([])
  const [tripYear, setTripYear] = useState<TripYear | null>(null)
  const [memberId, setMemberId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)
  const [hoveredSiteId, setHoveredSiteId] = useState<string | null>(null)
  const [view, setView] = useState<'list' | 'map'>('list')
  const [addSiteModalOpen, setAddSiteModalOpen] = useState(false)

  // Filter/sort state
  const [sortBy, setSortBy] = useState<SortOption>('votes')
  const [regionFilter, setRegionFilter] = useState<string>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all')

  // Refs for scrolling to cards
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

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
      const sitesRes = await fetch('/api/sites')
      const sitesData = await sitesRes.json()
      setSites(sitesData.sites || [])

      // Fetch user's votes
      if (currentMemberId) {
        const votesRes = await fetch(`/api/votes?memberId=${currentMemberId}`)
        const votesData = await votesRes.json()
        setMyVotes(votesData.votes || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load sites')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Get unique regions for filter dropdown
  const regions = useMemo(() => {
    const uniqueRegions = new Set<string>()
    sites.forEach(site => {
      if (site.region) {
        uniqueRegions.add(site.region)
      }
    })
    return Array.from(uniqueRegions).sort()
  }, [sites])

  // Filter and sort sites
  const filteredAndSortedSites = useMemo(() => {
    let result = [...sites]

    // Apply region filter
    if (regionFilter !== 'all') {
      result = result.filter(site => site.region === regionFilter)
    }

    // Apply difficulty filter
    if (difficultyFilter !== 'all') {
      result = result.filter(
        site => site.difficulty?.toLowerCase() === difficultyFilter
      )
    }

    // Apply sorting
    switch (sortBy) {
      case 'votes':
        result.sort((a, b) => b.vote_count - a.vote_count)
        break
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'distance':
        result.sort((a, b) => {
          if (a.distance_miles === null) return 1
          if (b.distance_miles === null) return -1
          return a.distance_miles - b.distance_miles
        })
        break
      case 'elevation':
        result.sort((a, b) => {
          if (a.elevation_gain_ft === null) return 1
          if (b.elevation_gain_ft === null) return -1
          return b.elevation_gain_ft - a.elevation_gain_ft
        })
        break
    }

    return result
  }, [sites, regionFilter, difficultyFilter, sortBy])

  // Create numbered sites for display (numbers based on filtered/sorted order)
  const numberedSites = useMemo(() => {
    const numberMap = new Map<string, number>()
    filteredAndSortedSites.forEach((site, index) => {
      numberMap.set(site.id, index + 1)
    })
    return numberMap
  }, [filteredAndSortedSites])

  // Sites with numbers for the map (only show filtered sites with their numbers)
  const sitesForMap = useMemo(() => {
    return filteredAndSortedSites.map((site, index) => ({
      ...site,
      number: index + 1
    }))
  }, [filteredAndSortedSites])

  const handleVote = async (siteId: string) => {
    if (!memberId) {
      toast.error('Please select a member first')
      return
    }
    if (!tripYear) {
      toast.error('No active trip year found')
      return
    }
    if (myVotes.length >= MAX_VOTES) {
      toast.error(`You can only vote for ${MAX_VOTES} sites`)
      return
    }

    const site = sites.find(s => s.id === siteId)

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
          siteId
        })
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to vote')
      }

      // Update with real vote ID
      setMyVotes(prev =>
        prev.map(v =>
          v.id === optimisticVote.id ? { ...v, id: data.vote.id } : v
        )
      )

      toast.success(`Voted for ${site?.name || 'site'}`)
    } catch (error) {
      console.error('Error voting:', error)
      // Rollback
      setMyVotes(prev => prev.filter(v => v.id !== optimisticVote.id))
      setSites(prev =>
        prev.map(s =>
          s.id === siteId ? { ...s, vote_count: s.vote_count - 1 } : s
        )
      )
      toast.error(error instanceof Error ? error.message : 'Failed to submit vote')
    }
  }

  const handleUnvote = async (siteId: string) => {
    const vote = myVotes.find(v => v.site_id === siteId)
    if (!vote) return

    const site = sites.find(s => s.id === siteId)

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

      toast.success(`Removed vote for ${site?.name || 'site'}`)
    } catch (error) {
      console.error('Error removing vote:', error)
      // Rollback
      setMyVotes(prev => [...prev, vote])
      setSites(prev =>
        prev.map(s =>
          s.id === siteId ? { ...s, vote_count: s.vote_count + 1 } : s
        )
      )
      toast.error('Failed to remove vote')
    }
  }

  // Handle map marker click - scroll to card and highlight
  const handleMapSiteSelect = (siteId: string) => {
    setSelectedSiteId(siteId)

    // Scroll to the card
    const cardElement = cardRefs.current.get(siteId)
    if (cardElement) {
      cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
        {/* Main content - split view */}
        <div className="flex-1 flex overflow-hidden">
          {/* List view - 60% */}
          <div
            className={`
              ${view === 'list' ? 'flex' : 'hidden'}
              md:flex md:w-[60%] flex-col overflow-hidden border-r border-stone-200
            `}
          >
            {/* Filter/Sort Row */}
            <div className="px-4 py-3 border-b border-stone-100 bg-stone-50 flex-shrink-0">
              <div className="flex flex-wrap items-center gap-3">
                {/* Sort dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-stone-600">Sort:</span>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                    <SelectTrigger className="w-[140px] h-8 text-sm bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="votes">Most Votes</SelectItem>
                      <SelectItem value="name">Name A-Z</SelectItem>
                      <SelectItem value="distance">Shortest Hike</SelectItem>
                      <SelectItem value="elevation">Most Elevation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Region filter */}
                {regions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-stone-600">Region:</span>
                    <Select value={regionFilter} onValueChange={setRegionFilter}>
                      <SelectTrigger className="w-[160px] h-8 text-sm bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Regions</SelectItem>
                        {regions.map(region => (
                          <SelectItem key={region} value={region}>
                            {region}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Difficulty filter */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-stone-600">Difficulty:</span>
                  <Select
                    value={difficultyFilter}
                    onValueChange={(v) => setDifficultyFilter(v as DifficultyFilter)}
                  >
                    <SelectTrigger className="w-[120px] h-8 text-sm bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="strenuous">Strenuous</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Votes remaining indicator */}
                <div className="ml-auto flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-md px-3 py-1.5">
                    <span className="text-sm text-stone-600">Votes Remaining</span>
                    <span className={`text-sm font-semibold ${MAX_VOTES - myVotes.length === 0 ? 'text-stone-400' : 'text-emerald-600'}`}>
                      {MAX_VOTES - myVotes.length}/{MAX_VOTES}
                    </span>
                  </div>
                  <Button
                    onClick={() => setAddSiteModalOpen(true)}
                    size="sm"
                    className="h-8"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Site
                  </Button>
                </div>

                {/* Mobile view toggle */}
                <div className="flex md:hidden gap-1">
                  <Button
                    variant={view === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setView('list')}
                    className="h-8"
                  >
                    List
                  </Button>
                  <Button
                    variant={view === 'map' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setView('map')}
                    className="h-8"
                  >
                    Map
                  </Button>
                </div>
              </div>
            </div>

            {/* Sites list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredAndSortedSites.length === 0 ? (
                <div className="text-center py-12 text-stone-500">
                  {sites.length === 0
                    ? 'No sites available yet.'
                    : 'No sites match your filters.'}
                </div>
              ) : (
                filteredAndSortedSites.map((site, index) => (
                  <SiteCard
                    key={site.id}
                    site={site}
                    number={index + 1}
                    isVoted={votedSiteIds.has(site.id)}
                    canVote={canVote}
                    onVote={() => handleVote(site.id)}
                    onUnvote={() => handleUnvote(site.id)}
                    isSelected={selectedSiteId === site.id}
                    isHovered={hoveredSiteId === site.id}
                    onMouseEnter={() => setHoveredSiteId(site.id)}
                    onMouseLeave={() => setHoveredSiteId(null)}
                    setRef={(el) => {
                      if (el) {
                        cardRefs.current.set(site.id, el)
                      } else {
                        cardRefs.current.delete(site.id)
                      }
                    }}
                  />
                ))
              )}
            </div>
          </div>

          {/* Map view - 40% - sticky */}
          <div
            className={`
              ${view === 'map' ? 'flex' : 'hidden'}
              md:flex md:w-[40%] flex-col sticky top-0 h-full
            `}
          >
            <SitesMap
              sites={sitesForMap}
              selectedSiteId={selectedSiteId}
              hoveredSiteId={hoveredSiteId}
              onSiteSelect={handleMapSiteSelect}
            />
          </div>
        </div>
      </div>

      <AddSiteModal
        open={addSiteModalOpen}
        onOpenChange={setAddSiteModalOpen}
        onSiteAdded={fetchData}
      />
    </AppShell>
  )
}
