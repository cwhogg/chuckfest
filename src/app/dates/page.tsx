'use client'

import { useEffect, useState, useCallback } from 'react'
import { AppShell } from '@/components/app-shell'
import { MemberAvatar } from '@/components/member-avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getCurrentMemberId } from '@/lib/auth-client'
import { toast } from 'sonner'

type AvailabilityStatus = 'available' | 'unavailable' | 'maybe' | null

interface DateOption {
  id: string
  trip_year_id: string
  start_date: string
  end_date: string
  label: string
  date_availability: DateAvailability[]
  stats: {
    available: number
    maybe: number
    unavailable: number
    totalResponses: number
    score: number
  }
}

interface DateAvailability {
  id: string
  member_id: string
  status: 'available' | 'unavailable' | 'maybe'
  updated_at: string
}

interface Member {
  id: string
  name: string
  email: string
}

interface TripYear {
  id: string
  year: number
  status: string
  date_voting_deadline: string | null
}

interface Summary {
  totalMembers: number
  respondedCount: number
  bestDateIds: string[]
}

// Status cycle: null -> available -> maybe -> unavailable -> null
const statusCycle: AvailabilityStatus[] = [null, 'available', 'maybe', 'unavailable']

function getNextStatus(current: AvailabilityStatus): AvailabilityStatus {
  const currentIndex = statusCycle.indexOf(current)
  return statusCycle[(currentIndex + 1) % statusCycle.length]
}

interface RankedDate {
  id: string
  label: string
  rank: number
  available: number
  maybe: number
  unavailable: number
  availableMembers: string[]
}

function TopDatesSection({
  dateOptions,
  members
}: {
  dateOptions: DateOption[]
  members: Member[]
}) {
  // Get dates with at least one response and rank them
  const datesWithResponses = dateOptions
    .filter((opt) => opt.stats.totalResponses > 0)
    .map((opt) => ({
      id: opt.id,
      label: opt.label,
      available: opt.stats.available,
      maybe: opt.stats.maybe,
      unavailable: opt.stats.unavailable,
      availableMembers: opt.date_availability
        .filter((a) => a.status === 'available')
        .map((a) => {
          const member = members.find((m) => m.id === a.member_id)
          return member?.name || ''
        })
        .filter(Boolean)
    }))
    .sort((a, b) => {
      // Primary: most available
      if (b.available !== a.available) return b.available - a.available
      // Tiebreaker: fewest unavailable
      if (a.unavailable !== b.unavailable) return a.unavailable - b.unavailable
      // Secondary tiebreaker: most maybe
      return b.maybe - a.maybe
    })

  // Assign ranks (handling ties)
  const rankedDates: RankedDate[] = []
  let currentRank = 1

  for (let i = 0; i < datesWithResponses.length && currentRank <= 3; i++) {
    const date = datesWithResponses[i]

    // Check if this date ties with the previous one
    if (i > 0) {
      const prev = datesWithResponses[i - 1]
      if (
        date.available === prev.available &&
        date.unavailable === prev.unavailable &&
        date.maybe === prev.maybe
      ) {
        // Same rank as previous (tie)
        rankedDates.push({ ...date, rank: rankedDates[rankedDates.length - 1].rank })
      } else {
        // New rank
        currentRank = rankedDates.length + 1
        if (currentRank <= 3) {
          rankedDates.push({ ...date, rank: currentRank })
        }
      }
    } else {
      rankedDates.push({ ...date, rank: 1 })
    }
  }

  // Take only top 3 ranks worth
  const topDates = rankedDates.slice(0, Math.min(rankedDates.length, 5)) // Allow some ties

  if (topDates.length === 0) {
    return (
      <div className="mb-6 p-6 bg-stone-50 rounded-xl border border-stone-200 text-center">
        <div className="text-stone-400 text-4xl mb-2">📅</div>
        <p className="text-stone-600 font-medium">No responses yet</p>
        <p className="text-stone-500 text-sm mt-1">Be the first to pick your dates!</p>
      </div>
    )
  }

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          border: 'border-amber-300',
          bg: 'bg-gradient-to-br from-amber-50 to-yellow-50',
          medal: '🥇',
          label: '1st',
          labelColor: 'text-amber-700'
        }
      case 2:
        return {
          border: 'border-stone-300',
          bg: 'bg-gradient-to-br from-stone-50 to-slate-50',
          medal: '🥈',
          label: '2nd',
          labelColor: 'text-stone-600'
        }
      case 3:
        return {
          border: 'border-orange-200',
          bg: 'bg-gradient-to-br from-orange-50 to-amber-50',
          medal: '🥉',
          label: '3rd',
          labelColor: 'text-orange-700'
        }
      default:
        return {
          border: 'border-stone-200',
          bg: 'bg-stone-50',
          medal: '',
          label: `${rank}th`,
          labelColor: 'text-stone-500'
        }
    }
  }

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-stone-800 mb-3">Top Dates</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {topDates.slice(0, 3).map((date) => {
          const style = getRankStyle(date.rank)
          return (
            <div
              key={date.id}
              className={`p-4 rounded-xl border-2 ${style.border} ${style.bg} transition-transform hover:scale-[1.02]`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="text-2xl mr-2">{style.medal}</span>
                  <span className={`text-xs font-semibold ${style.labelColor}`}>
                    {style.label}
                  </span>
                </div>
              </div>
              <div className="text-xl font-bold text-stone-800 mb-3">{date.label}</div>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-medium">&#10003;</span>
                  <span className="text-stone-700">
                    {date.available} available
                  </span>
                </div>
                {date.maybe > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600 font-medium">?</span>
                    <span className="text-stone-600">{date.maybe} maybe</span>
                  </div>
                )}
                {date.unavailable > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-red-600 font-medium">&#10005;</span>
                    <span className="text-stone-500">{date.unavailable} unavailable</span>
                  </div>
                )}
              </div>
              {date.availableMembers.length > 0 && (
                <div className="mt-3 pt-3 border-t border-stone-200/50">
                  <div className="flex -space-x-2">
                    {date.availableMembers.slice(0, 5).map((name, idx) => (
                      <div
                        key={idx}
                        className="w-7 h-7 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-xs font-medium text-emerald-700"
                        title={name}
                      >
                        {name.charAt(0)}
                      </div>
                    ))}
                    {date.availableMembers.length > 5 && (
                      <div className="w-7 h-7 rounded-full bg-stone-100 border-2 border-white flex items-center justify-center text-xs font-medium text-stone-600">
                        +{date.availableMembers.length - 5}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatusCell({
  status,
  onClick,
  isCurrentUser,
  isBestDate
}: {
  status: AvailabilityStatus
  onClick?: () => void
  isCurrentUser: boolean
  isBestDate: boolean
}) {
  const baseClasses = `w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-lg font-medium transition-all ${
    isCurrentUser ? 'cursor-pointer hover:scale-110' : ''
  }`

  const getBgColor = () => {
    if (!status) return 'bg-stone-100'
    switch (status) {
      case 'available':
        return 'bg-emerald-100'
      case 'maybe':
        return 'bg-amber-100'
      case 'unavailable':
        return 'bg-red-100'
    }
  }

  const getIcon = () => {
    if (!status) return <span className="text-stone-300">-</span>
    switch (status) {
      case 'available':
        return <span className="text-emerald-600">&#10003;</span>
      case 'maybe':
        return <span className="text-amber-600">?</span>
      case 'unavailable':
        return <span className="text-red-600">&#10005;</span>
    }
  }

  return (
    <div
      className={`${baseClasses} ${getBgColor()} rounded-md ${
        isBestDate ? 'ring-2 ring-emerald-500' : ''
      }`}
      onClick={onClick}
      role={isCurrentUser ? 'button' : undefined}
      tabIndex={isCurrentUser ? 0 : undefined}
      onKeyDown={(e) => {
        if (isCurrentUser && (e.key === 'Enter' || e.key === ' ')) {
          onClick?.()
        }
      }}
    >
      {getIcon()}
    </div>
  )
}

export default function DatesPage() {
  const [loading, setLoading] = useState(true)
  const [tripYear, setTripYear] = useState<TripYear | null>(null)
  const [dateOptions, setDateOptions] = useState<DateOption[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [memberId, setMemberId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const currentMemberId = getCurrentMemberId()
      setMemberId(currentMemberId)

      // First get the current trip year
      const tripYearRes = await fetch('/api/trip-years?current=true')
      const tripYearData = await tripYearRes.json()

      if (!tripYearData.success || !tripYearData.tripYear) {
        setLoading(false)
        return
      }

      const currentTripYear = tripYearData.tripYear
      setTripYear(currentTripYear)

      // Fetch dates data
      const datesRes = await fetch(`/api/dates/${currentTripYear.id}`)
      const datesData = await datesRes.json()

      if (datesData.success) {
        setDateOptions(datesData.dateOptions || [])
        setMembers(datesData.members || [])
        setSummary(datesData.summary || null)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load dates')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleGenerateDates = async () => {
    if (!tripYear) return

    setGenerating(true)
    try {
      const res = await fetch(`/api/trip-years/${tripYear.id}/generate-dates`, {
        method: 'POST'
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate dates')
      }

      toast.success(`Generated ${data.dateOptions?.length || 0} date options`)
      fetchData()
    } catch (error) {
      console.error('Error generating dates:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate dates')
    } finally {
      setGenerating(false)
    }
  }

  const handleToggleAvailability = async (dateOptionId: string) => {
    if (!memberId) {
      toast.error('Please select a member first')
      return
    }

    // Find current status
    const dateOption = dateOptions.find((d) => d.id === dateOptionId)
    const currentAvailability = dateOption?.date_availability.find(
      (a) => a.member_id === memberId
    )
    const currentStatus = currentAvailability?.status || null
    const newStatus = getNextStatus(currentStatus)

    // Optimistic update
    setDateOptions((prev) =>
      prev.map((opt) => {
        if (opt.id !== dateOptionId) return opt

        const existingIndex = opt.date_availability.findIndex(
          (a) => a.member_id === memberId
        )

        let newAvailability = [...opt.date_availability]
        if (newStatus === null) {
          // Remove
          newAvailability = newAvailability.filter((a) => a.member_id !== memberId)
        } else if (existingIndex >= 0) {
          // Update
          newAvailability[existingIndex] = {
            ...newAvailability[existingIndex],
            status: newStatus
          }
        } else {
          // Add
          newAvailability.push({
            id: 'temp-' + Date.now(),
            member_id: memberId,
            status: newStatus,
            updated_at: new Date().toISOString()
          })
        }

        // Recalculate stats
        const availableCount = newAvailability.filter((a) => a.status === 'available').length
        const maybeCount = newAvailability.filter((a) => a.status === 'maybe').length
        const unavailableCount = newAvailability.filter((a) => a.status === 'unavailable').length

        return {
          ...opt,
          date_availability: newAvailability,
          stats: {
            available: availableCount,
            maybe: maybeCount,
            unavailable: unavailableCount,
            totalResponses: newAvailability.length,
            score: availableCount + maybeCount * 0.5
          }
        }
      })
    )

    try {
      const res = await fetch('/api/dates/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          dateOptionId,
          status: newStatus
        })
      })

      if (!res.ok) {
        throw new Error('Failed to update availability')
      }
    } catch (error) {
      console.error('Error updating availability:', error)
      toast.error('Failed to save your response')
      // Rollback by refetching
      fetchData()
    }
  }

  const handleQuickAction = async (action: 'all-available' | 'all-unavailable' | 'clear') => {
    if (!memberId) {
      toast.error('Please select a member first')
      return
    }

    const updates = dateOptions.map((opt) => ({
      dateOptionId: opt.id,
      status: action === 'clear' ? null : action === 'all-available' ? 'available' : 'unavailable'
    }))

    // Optimistic update
    setDateOptions((prev) =>
      prev.map((opt) => {
        let newAvailability = opt.date_availability.filter((a) => a.member_id !== memberId)

        if (action !== 'clear') {
          const newStatus = action === 'all-available' ? 'available' : 'unavailable'
          newAvailability.push({
            id: 'temp-' + Date.now(),
            member_id: memberId,
            status: newStatus,
            updated_at: new Date().toISOString()
          })
        }

        const availableCount = newAvailability.filter((a) => a.status === 'available').length
        const maybeCount = newAvailability.filter((a) => a.status === 'maybe').length
        const unavailableCount = newAvailability.filter((a) => a.status === 'unavailable').length

        return {
          ...opt,
          date_availability: newAvailability,
          stats: {
            available: availableCount,
            maybe: maybeCount,
            unavailable: unavailableCount,
            totalResponses: newAvailability.length,
            score: availableCount + maybeCount * 0.5
          }
        }
      })
    )

    try {
      const res = await fetch('/api/dates/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, updates })
      })

      if (!res.ok) {
        throw new Error('Failed to update availability')
      }

      toast.success(
        action === 'clear'
          ? 'Responses cleared'
          : action === 'all-available'
          ? 'Marked all as available'
          : 'Marked all as unavailable'
      )
    } catch (error) {
      console.error('Error updating availability:', error)
      toast.error('Failed to save your responses')
      fetchData()
    }
  }

  // Get current member's response status
  const hasResponded = dateOptions.some((opt) =>
    opt.date_availability.some((a) => a.member_id === memberId)
  )

  // Check if dates are locked
  const isLocked = tripYear?.status === 'dates_locked' || tripYear?.status === 'site_locked' || tripYear?.status === 'complete'

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-stone-500">Loading dates...</div>
        </div>
      </AppShell>
    )
  }

  if (!tripYear) {
    return (
      <AppShell>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-stone-600">No active trip year found.</p>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    )
  }

  if (dateOptions.length === 0) {
    return (
      <AppShell>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <svg
                className="w-16 h-16 text-emerald-600 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <h2 className="text-xl font-semibold text-stone-800 mb-2">No Date Options Yet</h2>
              <p className="text-stone-600 mb-6 text-center max-w-md">
                Date options for Chuckfest {tripYear.year} haven&apos;t been generated yet.
                Click below to generate all possible Wednesday-Sunday trip windows.
              </p>
              <Button onClick={handleGenerateDates} disabled={generating}>
                {generating ? 'Generating...' : 'Generate Date Options'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    )
  }

  // Find the best dates for highlighting
  const bestDateIds = new Set(summary?.bestDateIds || [])

  // Sort members with current user first
  const sortedMembers = [...members].sort((a, b) => {
    if (a.id === memberId) return -1
    if (b.id === memberId) return 1
    return a.name.localeCompare(b.name)
  })

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-stone-800">
                Chuckfest {tripYear.year} - Pick Your Dates
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-stone-600">
                <span>
                  {summary?.respondedCount || 0} of {summary?.totalMembers || 0} people have
                  responded
                </span>
                {tripYear.date_voting_deadline && (
                  <>
                    <span className="text-stone-300">|</span>
                    <span>
                      Deadline:{' '}
                      {new Date(tripYear.date_voting_deadline).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div
              className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                hasResponded
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {hasResponded ? 'You have responded' : "You haven't responded yet"}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {!isLocked && (
          <div className="mb-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction('all-available')}
              className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            >
              <span className="mr-1">&#10003;</span> Available for all
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction('all-unavailable')}
              className="text-red-700 border-red-200 hover:bg-red-50"
            >
              <span className="mr-1">&#10005;</span> Unavailable for all
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction('clear')}
            >
              Clear my responses
            </Button>
          </div>
        )}

        {isLocked && (
          <div className="mb-4 px-4 py-3 bg-stone-100 rounded-lg text-stone-600 text-sm">
            Date voting is closed. The final dates have been selected.
          </div>
        )}

        {/* Top Dates Section */}
        <TopDatesSection dateOptions={dateOptions} members={members} />

        {/* Doodle Grid */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left p-3 bg-stone-50 sticky left-0 z-10 min-w-[140px]">
                    <span className="text-sm font-medium text-stone-600">Member</span>
                  </th>
                  {dateOptions.map((option) => (
                    <th
                      key={option.id}
                      className={`p-2 text-center min-w-[60px] ${
                        bestDateIds.has(option.id) ? 'bg-emerald-50' : 'bg-stone-50'
                      }`}
                    >
                      <div className="text-xs font-medium text-stone-700 whitespace-nowrap">
                        {option.label}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedMembers.map((member) => {
                  const isCurrentUser = member.id === memberId
                  const memberAvailability = new Map<string, AvailabilityStatus>()

                  dateOptions.forEach((opt) => {
                    const availability = opt.date_availability.find(
                      (a) => a.member_id === member.id
                    )
                    memberAvailability.set(opt.id, availability?.status || null)
                  })

                  const hasAnyResponse = Array.from(memberAvailability.values()).some(
                    (v) => v !== null
                  )

                  return (
                    <tr
                      key={member.id}
                      className={`border-b border-stone-100 ${
                        isCurrentUser
                          ? 'bg-emerald-50/50'
                          : !hasAnyResponse
                          ? 'bg-stone-50/50'
                          : ''
                      }`}
                    >
                      <td className="p-3 sticky left-0 bg-inherit z-10">
                        <div className="flex items-center gap-2">
                          <MemberAvatar name={member.name} size="sm" />
                          <div>
                            <div className="text-sm font-medium text-stone-800">
                              {member.name}
                              {isCurrentUser && (
                                <span className="ml-1 text-xs text-emerald-600">(you)</span>
                              )}
                            </div>
                            {!hasAnyResponse && (
                              <div className="text-xs text-stone-400">No response</div>
                            )}
                          </div>
                        </div>
                      </td>
                      {dateOptions.map((option) => {
                        const status = memberAvailability.get(option.id) || null
                        return (
                          <td key={option.id} className="p-1 text-center">
                            <div className="flex justify-center">
                              <StatusCell
                                status={status}
                                isCurrentUser={isCurrentUser && !isLocked}
                                isBestDate={bestDateIds.has(option.id)}
                                onClick={
                                  isCurrentUser && !isLocked
                                    ? () => handleToggleAvailability(option.id)
                                    : undefined
                                }
                              />
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}

                {/* Summary Row */}
                <tr className="bg-stone-100 font-medium">
                  <td className="p-3 sticky left-0 bg-stone-100 z-10">
                    <span className="text-sm text-stone-700">Summary</span>
                  </td>
                  {dateOptions.map((option) => {
                    const isBest = bestDateIds.has(option.id)
                    return (
                      <td
                        key={option.id}
                        className={`p-2 text-center ${isBest ? 'bg-emerald-100' : ''}`}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <div className="flex items-center gap-1 text-xs">
                            <span className="text-emerald-600">{option.stats.available}</span>
                            {option.stats.maybe > 0 && (
                              <>
                                <span className="text-stone-300">/</span>
                                <span className="text-amber-600">{option.stats.maybe}</span>
                              </>
                            )}
                          </div>
                          {isBest && (
                            <div className="text-[10px] text-emerald-700 font-semibold">
                              BEST
                            </div>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-stone-600">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center text-emerald-600">
              &#10003;
            </div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center text-amber-600">
              ?
            </div>
            <span>Maybe</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded bg-red-100 flex items-center justify-center text-red-600">
              &#10005;
            </div>
            <span>Unavailable</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded bg-stone-100 flex items-center justify-center text-stone-300">
              -
            </div>
            <span>No response</span>
          </div>
        </div>

        {/* Mobile Card View Alternative - shown on very small screens */}
        <div className="mt-8 block sm:hidden">
          <h3 className="text-lg font-semibold text-stone-800 mb-3">Your Quick Response</h3>
          <div className="space-y-2">
            {dateOptions.map((option) => {
              const myStatus =
                option.date_availability.find((a) => a.member_id === memberId)?.status || null
              return (
                <div
                  key={option.id}
                  className={`p-3 rounded-lg border ${
                    bestDateIds.has(option.id)
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-stone-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-stone-800">{option.label}</div>
                      <div className="text-xs text-stone-500">
                        {option.stats.available} yes, {option.stats.maybe} maybe
                      </div>
                    </div>
                    {!isLocked && (
                      <StatusCell
                        status={myStatus}
                        isCurrentUser={true}
                        isBestDate={bestDateIds.has(option.id)}
                        onClick={() => handleToggleAvailability(option.id)}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
