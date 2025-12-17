'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MemberAvatar } from '@/components/member-avatar'
import { ProgressTracker, getCurrentStage, TripStage } from '@/components/progress-tracker'
import { getCurrentMemberId } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

interface TripYear {
  id: string
  year: number
  status: string
  final_start_date: string | null
  final_end_date: string | null
  final_site_id: string | null
  permits_obtained: boolean
  site?: {
    id: string
    name: string
    region: string | null
    permit_type: string | null
    permit_url: string | null
    permit_advance_days: number | null
    photos: string[] | null
    distance_miles: number | null
    elevation_gain_ft: number | null
    peak_elevation_ft: number | null
  } | null
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
  is_active?: boolean
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

interface Attendance {
  id: string
  member_id: string
  status: 'in' | 'out' | 'maybe'
  notes: string | null
  member: Member
}

export default function DashboardPage() {
  const [tripYear, setTripYear] = useState<TripYear | null>(null)
  const [topSites, setTopSites] = useState<Site[]>([])
  const [myVotes, setMyVotes] = useState<Vote[]>([])
  const [dateSummary, setDateSummary] = useState<DateSummary | null>(null)
  const [hasSubmittedAvailability, setHasSubmittedAvailability] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [myAttendance, setMyAttendance] = useState<Attendance | null>(null)
  const [loading, setLoading] = useState(true)
  const [attendanceLoading, setAttendanceLoading] = useState(false)
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

        // Fetch attendance
        const attendanceRes = await fetch(`/api/attendance?tripYearId=${currentTripYear.id}`)
        const attendanceData = await attendanceRes.json()
        if (attendanceData.success) {
          setAttendance(attendanceData.attendance || [])
          if (currentMemberId) {
            const myAtt = attendanceData.attendance?.find((a: Attendance) => a.member_id === currentMemberId)
            setMyAttendance(myAtt || null)
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

  const updateAttendance = async (status: 'in' | 'out' | 'maybe') => {
    if (!memberId) return

    setAttendanceLoading(true)
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, status }),
      })
      const data = await res.json()
      if (data.success) {
        fetchData(memberId)
      }
    } catch (error) {
      console.error('Error updating attendance:', error)
    } finally {
      setAttendanceLoading(false)
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

    if (diffDays < 0) return null
    if (diffDays === 0) return 'Trip starts today!'
    if (diffDays === 1) return '1 day away'
    return `${diffDays} days away`
  }

  // Determine current stage
  const datesLocked = !!tripYear?.final_start_date
  const siteSelected = !!tripYear?.final_site_id
  const permitsObtained = tripYear?.permits_obtained || false
  const allMembersResponded = members.length > 0 && attendance.length === members.length
  const tripStarted = tripYear?.final_start_date
    ? new Date(tripYear.final_start_date + 'T12:00:00') <= new Date()
    : false

  const currentStage: TripStage = getCurrentStage({
    datesLocked,
    siteSelected,
    permitsObtained,
    allMembersResponded,
    tripStarted,
  })

  // Determine which cards to highlight
  const highlightDates = currentStage === 'start'
  const highlightSites = currentStage === 'start' || currentStage === 'dates_selected'
  const highlightPermits = currentStage === 'site_selected'
  const highlightAttendance = currentStage === 'permits_obtained'

  // Group attendance by status
  const inMembers = attendance.filter(a => a.status === 'in')
  const outMembers = attendance.filter(a => a.status === 'out')
  const maybeMembers = attendance.filter(a => a.status === 'maybe')
  const pendingMembers = members.filter(m => !attendance.find(a => a.member_id === m.id))

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
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-[#2d5016] mb-2">
              Chuckfest {tripYear?.year || new Date().getFullYear()}
            </h1>
            {countdown && (
              <p className="text-xl text-[#5c4033] mb-4">{countdown}</p>
            )}
          </div>

          {/* Progress Tracker */}
          <div className="mb-8 px-4">
            <ProgressTracker currentStage={currentStage} />
          </div>

          {/* Main Content Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Card 1: Trip Dates */}
            <Card
              className={cn(
                'bg-[#fffdf9] transition-all duration-300',
                highlightDates
                  ? 'border-2 border-[#2d5016] bg-[#f5f9f4] shadow-lg'
                  : 'border-[#e8dcc8]'
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#3d352e] flex items-center gap-2">
                    {datesLocked && (
                      <svg className="w-5 h-5 text-[#2d5016]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    )}
                    <svg className="w-5 h-5 text-[#2d5016]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Trip Dates
                  </CardTitle>
                  {highlightDates && !datesLocked && (
                    <Badge className="bg-[#f5e6c8] text-[#5c4033] text-xs">ACTION NEEDED</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {datesLocked ? (
                  <div>
                    <p className="text-lg font-semibold text-[#2d5016] mb-1">
                      {formatDate(tripYear!.final_start_date!)} - {formatDate(tripYear!.final_end_date!)}
                    </p>
                    <p className="text-sm text-[#7a7067]">
                      {formatFullDate(tripYear!.final_start_date!)}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dateSummary ? (
                      <>
                        <p className="text-sm text-[#5c4033]">
                          <span className="font-medium">{dateSummary.respondedCount}</span> of{' '}
                          <span className="font-medium">{dateSummary.totalMembers}</span> have responded
                        </p>
                        {dateSummary.bestDates.length > 0 && (
                          <div className="space-y-1">
                            {dateSummary.bestDates.slice(0, 3).map((date, i) => (
                              <div key={date.id} className="flex justify-between text-sm">
                                <span className="text-[#3d352e]">
                                  {formatDate(date.startDate)} - {formatDate(date.endDate)}
                                </span>
                                <Badge variant="outline" className="bg-[#e8f0e6] text-[#2d5016] border-[#c9d4c5]">
                                  {date.available} available
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                        {dateSummary.notRespondedMembers.length > 0 && (
                          <p className="text-xs text-[#7a7067]">
                            Waiting on: {dateSummary.notRespondedMembers.slice(0, 3).map(m => m.name).join(', ')}
                            {dateSummary.notRespondedMembers.length > 3 && ` +${dateSummary.notRespondedMembers.length - 3} more`}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-[#7a7067]">Date voting in progress</p>
                    )}
                    <Link href="/dates">
                      <Button
                        size="sm"
                        className={cn(
                          'w-full mt-2',
                          hasSubmittedAvailability
                            ? 'bg-[#5c4033] hover:bg-[#4a3429]'
                            : 'bg-[#2d5016] hover:bg-[#234012]'
                        )}
                      >
                        {hasSubmittedAvailability ? 'Update Availability' : 'Submit Your Dates'}
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card 2: Destination */}
            <Card
              className={cn(
                'bg-[#fffdf9] transition-all duration-300',
                highlightSites && !siteSelected
                  ? 'border-2 border-[#2d5016] bg-[#f5f9f4] shadow-lg'
                  : 'border-[#e8dcc8]'
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#3d352e] flex items-center gap-2">
                    {siteSelected && (
                      <svg className="w-5 h-5 text-[#2d5016]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    )}
                    <svg className="w-5 h-5 text-[#2d5016]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Destination
                  </CardTitle>
                  {highlightSites && datesLocked && !siteSelected && (
                    <Badge className="bg-[#f5e6c8] text-[#5c4033] text-xs">CURRENT STEP</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {siteSelected && tripYear?.site ? (
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      {tripYear.site.photos?.[0] && (
                        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={tripYear.site.photos[0]}
                            alt={tripYear.site.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-[#2d5016]">{tripYear.site.name}</p>
                        {tripYear.site.region && (
                          <p className="text-sm text-[#5c4033]">{tripYear.site.region}</p>
                        )}
                        <div className="text-xs text-[#7a7067] mt-1 space-y-0.5">
                          {tripYear.site.distance_miles && (
                            <p>{tripYear.site.distance_miles} miles</p>
                          )}
                          {tripYear.site.elevation_gain_ft && (
                            <p>{tripYear.site.elevation_gain_ft.toLocaleString()}ft gain</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/sites/${tripYear.site.id}`}>
                        <Button variant="outline" size="sm" className="border-[#c9b896] text-[#5c4033] hover:bg-[#e8dcc8]">
                          View Details
                        </Button>
                      </Link>
                      {tripYear.site.permit_url && (
                        <a href={tripYear.site.permit_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="border-[#c9b896] text-[#5c4033] hover:bg-[#e8dcc8]">
                            Permits
                            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topSites.length > 0 ? (
                      <>
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
                                <p className="text-xs text-[#7a7067]">
                                  {site.permit_type || 'Unknown permit type'}
                                </p>
                              </div>
                              <Badge variant="outline" className="bg-[#e8dcc8] text-[#5c4033] border-[#c9b896]">
                                {site.vote_count} vote{site.vote_count !== 1 ? 's' : ''}
                              </Badge>
                            </Link>
                          ))}
                        </div>
                        <p className="text-xs text-[#7a7067]">
                          Your votes: {myVotes.length}/5 used
                        </p>
                      </>
                    ) : (
                      <p className="text-[#7a7067]">No sites voted on yet</p>
                    )}
                    <Link href="/sites">
                      <Button size="sm" className="w-full bg-[#5c4033] hover:bg-[#4a3429]">
                        Vote on Sites
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card 3: Who's In */}
            <Card
              className={cn(
                'bg-[#fffdf9] transition-all duration-300',
                highlightAttendance
                  ? 'border-2 border-[#2d5016] bg-[#f5f9f4] shadow-lg'
                  : 'border-[#e8dcc8]',
                !datesLocked && 'opacity-60'
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#3d352e] flex items-center gap-2">
                    {allMembersResponded && permitsObtained && (
                      <svg className="w-5 h-5 text-[#2d5016]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    )}
                    <svg className="w-5 h-5 text-[#2d5016]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Who&apos;s In
                  </CardTitle>
                  {highlightAttendance && !myAttendance && (
                    <Badge className="bg-[#f5e6c8] text-[#5c4033] text-xs">ACTION NEEDED</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!datesLocked ? (
                  <div>
                    <p className="text-[#7a7067] mb-3">Confirm attendance after dates are locked</p>
                    <div className="flex flex-wrap gap-1">
                      {members.slice(0, 12).map((member) => (
                        <MemberAvatar key={member.id} name={member.name} size="sm" className="opacity-40" />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Attendance groups */}
                    <div className="space-y-3">
                      {inMembers.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-[#2d5016] mb-1">
                            In ({inMembers.length})
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {inMembers.map((a) => (
                              <div key={a.id} className="relative group">
                                <MemberAvatar
                                  name={a.member.name}
                                  size="sm"
                                  className={cn(a.member_id === memberId && 'ring-2 ring-[#2d5016]')}
                                />
                                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-[#3d352e] text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                  {a.member.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {maybeMembers.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-[#5c4033] mb-1">
                            Maybe ({maybeMembers.length})
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {maybeMembers.map((a) => (
                              <div key={a.id} className="relative group">
                                <MemberAvatar
                                  name={a.member.name}
                                  size="sm"
                                  className={cn('opacity-70', a.member_id === memberId && 'ring-2 ring-[#5c4033]')}
                                />
                                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-[#3d352e] text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                  {a.member.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {outMembers.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-[#7a7067] mb-1">
                            Out ({outMembers.length})
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {outMembers.map((a) => (
                              <div key={a.id} className="relative group">
                                <MemberAvatar
                                  name={a.member.name}
                                  size="sm"
                                  className={cn('opacity-40', a.member_id === memberId && 'ring-2 ring-[#7a7067]')}
                                />
                                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-[#3d352e] text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                  {a.member.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {pendingMembers.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-[#7a7067] mb-1">
                            Pending ({pendingMembers.length})
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {pendingMembers.map((m) => (
                              <div key={m.id} className="relative group">
                                <MemberAvatar
                                  name={m.name}
                                  size="sm"
                                  className={cn('opacity-30', m.id === memberId && 'ring-2 ring-[#c9b896]')}
                                />
                                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-[#3d352e] text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                  {m.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Current user's response buttons */}
                    {!myAttendance ? (
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => updateAttendance('in')}
                          disabled={attendanceLoading}
                          className="bg-[#2d5016] hover:bg-[#234012]"
                        >
                          I&apos;m In
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateAttendance('maybe')}
                          disabled={attendanceLoading}
                          className="border-[#c9b896] text-[#5c4033] hover:bg-[#e8dcc8]"
                        >
                          Maybe
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateAttendance('out')}
                          disabled={attendanceLoading}
                          className="text-[#7a7067] hover:bg-[#f5f3f0]"
                        >
                          Can&apos;t Make It
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between pt-2">
                        <p className="text-sm text-[#5c4033]">
                          Your response: <span className="font-medium capitalize">{myAttendance.status}</span>
                        </p>
                        <div className="flex gap-1">
                          {myAttendance.status !== 'in' && (
                            <Button size="sm" variant="ghost" onClick={() => updateAttendance('in')} disabled={attendanceLoading} className="text-xs px-2">
                              I&apos;m In
                            </Button>
                          )}
                          {myAttendance.status !== 'maybe' && (
                            <Button size="sm" variant="ghost" onClick={() => updateAttendance('maybe')} disabled={attendanceLoading} className="text-xs px-2">
                              Maybe
                            </Button>
                          )}
                          {myAttendance.status !== 'out' && (
                            <Button size="sm" variant="ghost" onClick={() => updateAttendance('out')} disabled={attendanceLoading} className="text-xs px-2">
                              Out
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card 4: Permit Status */}
            <Card
              className={cn(
                'bg-[#fffdf9] transition-all duration-300',
                highlightPermits
                  ? 'border-2 border-[#2d5016] bg-[#f5f9f4] shadow-lg'
                  : 'border-[#e8dcc8]',
                !siteSelected && 'opacity-60'
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#3d352e] flex items-center gap-2">
                    {permitsObtained && (
                      <svg className="w-5 h-5 text-[#2d5016]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    )}
                    <svg className="w-5 h-5 text-[#2d5016]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Permit Status
                  </CardTitle>
                  {highlightPermits && !permitsObtained && (
                    <Badge className="bg-[#f5e6c8] text-[#5c4033] text-xs">CURRENT STEP</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!siteSelected ? (
                  <p className="text-[#7a7067]">Select destination first</p>
                ) : permitsObtained ? (
                  <div className="flex items-center gap-2">
                    <svg className="w-6 h-6 text-[#2d5016]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    <span className="font-semibold text-[#2d5016]">Permits secured!</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tripYear?.site && (
                      <>
                        <div>
                          <p className="font-medium text-[#3d352e]">{tripYear.site.permit_type || 'Recreation.gov'}</p>
                          {tripYear.site.permit_advance_days && (
                            <p className="text-sm text-[#5c4033]">
                              Opens {tripYear.site.permit_advance_days} days before trip
                            </p>
                          )}
                        </div>
                        <p className="text-sm text-[#7a7067]">Permits not yet obtained</p>
                        {tripYear.site.permit_url && (
                          <a href={tripYear.site.permit_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="border-[#c9b896] text-[#5c4033] hover:bg-[#e8dcc8]">
                              Go to Permits Site
                              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </Button>
                          </a>
                        )}
                      </>
                    )}
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
