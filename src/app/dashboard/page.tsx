'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MemberAvatar } from '@/components/member-avatar'
import { getCurrentMemberId } from '@/lib/auth-client'

interface TripYear {
  id: string
  year: number
  status: string
  final_start_date: string | null
  final_end_date: string | null
}

interface Site {
  id: string
  name: string
  region: string | null
  vote_count: number
  photos?: string[] | null
  permit_url: string | null
  permit_type: string | null
  permit_advance_days: number | null
}

interface Member {
  id: string
  name: string
}

interface Vote {
  id: string
  site_id: string
}

interface DateSummary {
  totalMembers: number
  respondedCount: number
  notRespondedMembers: Member[]
  bestDates: Array<{
    id: string
    label: string
    startDate: string
    endDate: string
    available: number
    score: number
  }>
}

const statusLabels: Record<string, string> = {
  planning: 'Planning in Progress',
  dates_open: 'Date Voting Open',
  dates_locked: 'Dates Locked',
  site_selected: 'Site Selected',
  trip_complete: 'Trip Complete',
}

const statusColors: Record<string, string> = {
  planning: 'bg-[#f5e6c8] text-[#5c4033]',
  dates_open: 'bg-[#f5e6c8] text-[#5c4033]',
  dates_locked: 'bg-[#e8f0e6] text-[#2d5016]',
  site_selected: 'bg-[#e8f0e6] text-[#2d5016]',
  trip_complete: 'bg-[#e8dcc8] text-[#5c4033]',
}

export default function DashboardPage() {
  const [tripYear, setTripYear] = useState<TripYear | null>(null)
  const [topSites, setTopSites] = useState<Site[]>([])
  const [myVotes, setMyVotes] = useState<Vote[]>([])
  const [dateSummary, setDateSummary] = useState<DateSummary | null>(null)
  const [hasSubmittedAvailability, setHasSubmittedAvailability] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [memberId, setMemberId] = useState<string | null>(null)

  useEffect(() => {
    const currentMemberId = getCurrentMemberId()
    setMemberId(currentMemberId)
    fetchData(currentMemberId)
  }, [])

  const fetchData = async (currentMemberId: string | null) => {
    try {
      // Fetch current trip year
      const tripYearRes = await fetch('/api/trip-years?current=true')
      const tripYearData = await tripYearRes.json()
      const currentTripYear = tripYearData.tripYear
      setTripYear(currentTripYear)

      // Fetch all sites with vote counts
      const sitesRes = await fetch('/api/sites')
      const sitesData = await sitesRes.json()
      const sites = sitesData.sites || []

      // Sort by votes and get top 3
      const sortedSites = [...sites].sort((a: Site, b: Site) => b.vote_count - a.vote_count)
      setTopSites(sortedSites.slice(0, 3))

      // Fetch user's votes
      if (currentMemberId) {
        const votesRes = await fetch(`/api/votes?memberId=${currentMemberId}`)
        const votesData = await votesRes.json()
        setMyVotes(votesData.votes || [])
      }

      // Fetch date summary if trip year exists
      if (currentTripYear) {
        const summaryRes = await fetch(`/api/dates/summary/${currentTripYear.id}`)
        const summaryData = await summaryRes.json()
        if (summaryData.success) {
          setDateSummary(summaryData.summary)

          // Check if current member has submitted availability
          if (currentMemberId) {
            const notResponded = summaryData.summary.notRespondedMembers || []
            setHasSubmittedAvailability(!notResponded.some((m: Member) => m.id === currentMemberId))
          }
        }
      }

      // Fetch all active members
      const membersRes = await fetch('/api/members')
      const membersData = await membersRes.json()
      setMembers(membersData.members?.filter((m: Member & { is_active: boolean }) => m.is_active) || [])

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatFullDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getCountdown = () => {
    if (!tripYear?.final_start_date) return null

    const startDate = new Date(tripYear.final_start_date + 'T12:00:00')
    const today = new Date()
    const diffTime = startDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'Trip has passed'
    if (diffDays === 0) return 'Trip starts today!'
    if (diffDays === 1) return '1 day away'
    return `${diffDays} days away`
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-[#7a7067]">Loading dashboard...</div>
        </div>
      </AppShell>
    )
  }

  const countdown = getCountdown()

  return (
    <AppShell>
      <div className="min-h-[calc(100vh-4rem)] bg-[#faf6f0] py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-[#2d5016] mb-2">
              Chuckfest {tripYear?.year || new Date().getFullYear()}
            </h1>
            {countdown ? (
              <p className="text-xl text-[#5c4033] mb-3">{countdown}</p>
            ) : (
              <p className="text-xl text-[#7a7067] mb-3">Trip dates not set</p>
            )}
            {tripYear && (
              <Badge className={statusColors[tripYear.status] || 'bg-[#e8dcc8] text-[#5c4033]'}>
                {statusLabels[tripYear.status] || tripYear.status}
              </Badge>
            )}
          </div>

          {/* Quick Actions Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Link href="/sites">
              <Card className="h-full bg-[#fffdf9] border-[#e8dcc8] hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[#e8f0e6] flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#2d5016]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-[#3d352e] mb-1">Vote on Sites</h3>
                  <p className="text-sm text-[#7a7067]">{myVotes.length}/5 votes cast</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dates">
              <Card className="h-full bg-[#fffdf9] border-[#e8dcc8] hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[#f5e6c8] flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#5c4033]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-[#3d352e] mb-1">Select Dates</h3>
                  <p className="text-sm text-[#7a7067]">
                    {hasSubmittedAvailability ? 'Availability submitted' : 'Not yet submitted'}
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/past-trips">
              <Card className="h-full bg-[#fffdf9] border-[#e8dcc8] hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[#e8dcc8] flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#5c4033]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-[#3d352e] mb-1">Past Trips</h3>
                  <p className="text-sm text-[#7a7067]">View history</p>
                </CardContent>
              </Card>
            </Link>

            <Card className={`h-full border-[#e8dcc8] ${tripYear?.final_start_date ? 'bg-[#fffdf9] hover:shadow-md cursor-pointer' : 'bg-[#f5f3f0] opacity-60'}`}>
              <CardContent className="p-4 text-center">
                <div className={`w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center ${tripYear?.final_start_date ? 'bg-[#e8f0e6]' : 'bg-[#e8dcc8]'}`}>
                  <svg className={`w-5 h-5 ${tripYear?.final_start_date ? 'text-[#2d5016]' : 'text-[#7a7067]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className={`font-semibold mb-1 ${tripYear?.final_start_date ? 'text-[#3d352e]' : 'text-[#7a7067]'}`}>
                  Attendance
                </h3>
                <p className="text-sm text-[#7a7067]">
                  {tripYear?.final_start_date ? 'Confirm now' : 'After dates locked'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Status Cards Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Trip Dates Card */}
            <Card className="bg-[#fffdf9] border-[#e8dcc8]">
              <CardHeader className="pb-3">
                <CardTitle className="text-[#3d352e] flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#2d5016]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Trip Dates
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tripYear?.final_start_date && tripYear?.final_end_date ? (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-5 h-5 text-[#2d5016]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                      <span className="text-lg font-semibold text-[#2d5016]">
                        {formatDate(tripYear.final_start_date)} - {formatDate(tripYear.final_end_date)}
                      </span>
                    </div>
                    <p className="text-sm text-[#7a7067]">
                      {formatFullDate(tripYear.final_start_date)}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-[#5c4033] font-medium mb-2">Pending - Date voting in progress</p>
                    {dateSummary && (
                      <p className="text-sm text-[#7a7067]">
                        {dateSummary.respondedCount} of {dateSummary.totalMembers} members have submitted availability
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Destination Card */}
            <Card className="bg-[#fffdf9] border-[#e8dcc8]">
              <CardHeader className="pb-3">
                <CardTitle className="text-[#3d352e] flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#2d5016]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Destination
                </CardTitle>
                <CardDescription className="text-[#7a7067]">
                  {topSites.length > 0 ? 'Top voted sites' : 'No sites yet'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {topSites.length > 0 ? (
                  <div className="space-y-2">
                    {topSites.map((site, index) => (
                      <Link
                        key={site.id}
                        href={`/sites/${site.id}`}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#f5f3f0] transition-colors"
                      >
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-[#2d5016] text-[#faf6f0]' : 'bg-[#e8dcc8] text-[#5c4033]'
                        }`}>
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#3d352e] truncate">{site.name}</p>
                          {site.region && (
                            <p className="text-xs text-[#7a7067]">{site.region}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="bg-[#e8dcc8] text-[#5c4033] border-[#c9b896]">
                          {site.vote_count} vote{site.vote_count !== 1 ? 's' : ''}
                        </Badge>
                      </Link>
                    ))}
                    <Link href="/sites">
                      <Button variant="outline" size="sm" className="w-full mt-2 border-[#c9b896] text-[#5c4033] hover:bg-[#e8dcc8]">
                        View All Sites
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-[#7a7067] mb-3">No sites have been added yet</p>
                    <Link href="/sites">
                      <Button size="sm" className="bg-[#5c4033] hover:bg-[#4a3429]">
                        Add Sites
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Who's In Card */}
            <Card className="bg-[#fffdf9] border-[#e8dcc8]">
              <CardHeader className="pb-3">
                <CardTitle className="text-[#3d352e] flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#2d5016]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Who's In
                </CardTitle>
                <CardDescription className="text-[#7a7067]">
                  {members.length} active members
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tripYear?.final_start_date ? (
                  <div>
                    <p className="text-[#7a7067] mb-3">Attendance confirmation coming soon</p>
                    <div className="flex flex-wrap gap-2">
                      {members.slice(0, 8).map((member) => (
                        <MemberAvatar key={member.id} name={member.name} size="sm" />
                      ))}
                      {members.length > 8 && (
                        <div className="w-8 h-8 rounded-full bg-[#e8dcc8] flex items-center justify-center text-xs text-[#5c4033] font-medium">
                          +{members.length - 8}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-[#7a7067] mb-3">Confirm attendance after dates are locked</p>
                    <div className="flex flex-wrap gap-2">
                      {members.slice(0, 8).map((member) => (
                        <MemberAvatar key={member.id} name={member.name} size="sm" />
                      ))}
                      {members.length > 8 && (
                        <div className="w-8 h-8 rounded-full bg-[#e8dcc8] flex items-center justify-center text-xs text-[#5c4033] font-medium">
                          +{members.length - 8}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Permit Status Card */}
            <Card className="bg-[#fffdf9] border-[#e8dcc8]">
              <CardHeader className="pb-3">
                <CardTitle className="text-[#3d352e] flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#2d5016]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Permit Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topSites.length > 0 && topSites[0].permit_url ? (
                  <div>
                    <p className="font-medium text-[#3d352e] mb-1">{topSites[0].name}</p>
                    {topSites[0].permit_type && (
                      <p className="text-sm text-[#5c4033] mb-2">
                        {topSites[0].permit_type}
                        {topSites[0].permit_advance_days && (
                          <span> • Opens {topSites[0].permit_advance_days} days in advance</span>
                        )}
                      </p>
                    )}
                    <a
                      href={topSites[0].permit_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="border-[#c9b896] text-[#5c4033] hover:bg-[#e8dcc8]">
                        Recreation.gov
                        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </Button>
                    </a>
                  </div>
                ) : (
                  <div>
                    <p className="text-[#7a7067]">Permit info will show once a site is selected or voted on</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
