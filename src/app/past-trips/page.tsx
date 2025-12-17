'use client'

import { useEffect, useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { MemberAvatar } from '@/components/member-avatar'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import dynamic from 'next/dynamic'

const TripLocationMap = dynamic(
  () => import('@/components/trip-location-map').then(mod => mod.TripLocationMap),
  {
    ssr: false,
    loading: () => <div className="w-full h-full bg-stone-100 flex items-center justify-center text-stone-400 text-xs">...</div>
  }
)

const FullScreenMap = dynamic(
  () => import('@/components/trip-location-map').then(mod => mod.FullScreenMap),
  {
    ssr: false,
    loading: () => <div className="w-full h-full bg-stone-100 flex items-center justify-center text-stone-400">Loading map...</div>
  }
)

interface Member {
  id: string
  name: string
  email: string
}

interface Site {
  id: string
  name: string
  photos: string[] | null
  latitude: number | null
  longitude: number | null
}

interface PastTrip {
  id: string
  year: number
  start_date: string | null
  end_date: string | null
  site_id: string | null
  site: Site | null
  location_name: string | null
  hike_miles: number | null
  elevation_gain_ft: number | null
  campsite_elevation_ft: number | null
  album_url: string | null
  cover_photo_url: string | null
  notes: string | null
  attendees: Member[]
}

interface Stats {
  totalTrips: number
  totalMiles: number
  totalElevationGain: number
  highestCamp: number
  lowestCamp: number
  mostTripsAttendee: { name: string; count: number } | null
  topAttendees: { name: string; count: number }[]
}

function formatDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate || !endDate) return ''

  const start = new Date(startDate)
  const end = new Date(endDate)

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const startMonth = monthNames[start.getMonth()]
  const endMonth = monthNames[end.getMonth()]
  const startDay = start.getDate()
  const endDay = end.getDate()

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}`
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`
}

function StatCard({ label, value, unit, icon }: { label: string; value: string | number; unit?: string; icon: string }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold text-stone-800">
        {value}
        {unit && <span className="text-sm font-normal text-stone-500 ml-1">{unit}</span>}
      </div>
      <div className="text-sm text-stone-500">{label}</div>
    </div>
  )
}

function TripCard({ trip, tripNumber, onMapClick, hideMapThumbnail }: { trip: PastTrip; tripNumber: number; onMapClick: (lat: number, lng: number, name: string) => void; hideMapThumbnail?: boolean }) {
  const [showAllAttendees, setShowAllAttendees] = useState(false)

  return (
    <div className="relative flex gap-4 md:gap-8">
      {/* Year badge - timeline style */}
      <div className="hidden md:flex flex-col items-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center shadow-lg">
          <span className="text-2xl font-bold text-white">{trip.year}</span>
        </div>
        <div className="w-0.5 flex-1 bg-stone-200 mt-4" />
      </div>

      {/* Card */}
      <div className="flex-1 mb-8">
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          {/* Header with photo background or gradient */}
          <div className="relative h-40 bg-gradient-to-br from-stone-100 to-stone-200 overflow-hidden">
            {(trip.cover_photo_url || trip.site?.photos?.[0]) ? (
              <img
                src={trip.cover_photo_url || trip.site?.photos?.[0] || ''}
                alt={trip.location_name || ''}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-16 h-16 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            {/* Trip number badge */}
            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1">
              <span className="text-sm font-semibold text-stone-700">#{tripNumber}</span>
            </div>

            {/* Mobile year badge */}
            <div className="absolute top-3 left-3 md:hidden bg-emerald-600 rounded-lg px-3 py-1">
              <span className="text-sm font-bold text-white">{trip.year}</span>
            </div>

            {/* Location name */}
            <div className="absolute bottom-3 left-4 right-4">
              <h3 className="text-xl font-bold text-white truncate">
                {trip.location_name}
              </h3>
              {trip.start_date && (
                <p className="text-white/80 text-sm">
                  {formatDateRange(trip.start_date, trip.end_date)}
                </p>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Stats + Map row */}
            <div className="flex gap-4 mb-4">
              {/* Left: Stats and notes */}
              <div className="flex-1 min-w-0">
                {/* Stats */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-2">
                  {trip.hike_miles && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-600">&#128694;</span>
                      <span className="text-stone-700">{trip.hike_miles} mi</span>
                    </div>
                  )}
                  {trip.elevation_gain_ft && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-600">&#9650;</span>
                      <span className="text-stone-700">{trip.elevation_gain_ft.toLocaleString()} ft gain</span>
                    </div>
                  )}
                  {trip.campsite_elevation_ft && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-blue-600">&#9978;</span>
                      <span className="text-stone-700">{trip.campsite_elevation_ft.toLocaleString()} ft camp</span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {trip.notes && (
                  <p className="text-stone-600 text-sm italic">&ldquo;{trip.notes}&rdquo;</p>
                )}
              </div>

              {/* Right: Map thumbnail */}
              {trip.site?.latitude && trip.site?.longitude && !hideMapThumbnail && (
                <button
                  onClick={() => onMapClick(trip.site!.latitude!, trip.site!.longitude!, trip.location_name || trip.site!.name)}
                  className="flex-shrink-0 w-28 h-28 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all"
                >
                  <TripLocationMap
                    latitude={trip.site.latitude}
                    longitude={trip.site.longitude}
                    className="w-full h-full pointer-events-none"
                  />
                </button>
              )}
            </div>

            {/* Attendees section */}
            <div className="border-t border-stone-100 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-stone-500">
                  {trip.attendees.length} attended
                </span>
                {trip.album_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                    asChild
                  >
                    <a href={trip.album_url} target="_blank" rel="noopener noreferrer">
                      View Album &#128247;
                    </a>
                  </Button>
                )}
              </div>

              {/* Avatar stack with tooltip */}
              <TooltipProvider>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {trip.attendees.slice(0, 6).map((member) => (
                      <Tooltip key={member.id}>
                        <TooltipTrigger asChild>
                          <div>
                            <MemberAvatar name={member.name} size="sm" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{member.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {trip.attendees.length > 6 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="w-8 h-8 rounded-full bg-stone-200 border-2 border-white flex items-center justify-center text-xs font-medium text-stone-600 cursor-pointer"
                            onClick={() => setShowAllAttendees(!showAllAttendees)}
                          >
                            +{trip.attendees.length - 6}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {trip.attendees
                              .slice(6)
                              .map((m) => m.name)
                              .join(', ')}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>

                  {/* Expandable full list */}
                  <button
                    onClick={() => setShowAllAttendees(!showAllAttendees)}
                    className="text-xs text-stone-400 hover:text-stone-600"
                  >
                    {showAllAttendees ? 'Hide' : 'Show all'}
                  </button>
                </div>
              </TooltipProvider>

              {/* Full attendee list */}
              {showAllAttendees && (
                <div className="mt-3 p-3 bg-stone-50 rounded-lg">
                  <div className="flex flex-wrap gap-2">
                    {trip.attendees.map((member) => (
                      <span
                        key={member.id}
                        className="px-2 py-1 bg-white rounded-full text-xs text-stone-700 border border-stone-200"
                      >
                        {member.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PastTripsPage() {
  const [trips, setTrips] = useState<PastTrip[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedMap, setExpandedMap] = useState<{ lat: number; lng: number; name: string } | null>(null)

  const handleMapClick = (lat: number, lng: number, name: string) => {
    setExpandedMap({ lat, lng, name })
  }

  useEffect(() => {
    async function fetchTrips() {
      try {
        const res = await fetch('/api/past-trips')
        const data = await res.json()

        if (data.success) {
          setTrips(data.trips || [])
          setStats(data.stats || null)
        }
      } catch (error) {
        console.error('Error fetching past trips:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTrips()
  }, [])

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-stone-500">Loading trip history...</div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-800 mb-2">Chuckfest Archives</h1>
          <p className="text-stone-600">
            {trips.length} adventure{trips.length !== 1 ? 's' : ''} since {trips.length > 0 ? trips[trips.length - 1].year : '2020'}
          </p>
        </div>

        {/* Stats summary */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
            <StatCard
              icon="&#127956;"
              label="Total Trips"
              value={stats.totalTrips}
            />
            <StatCard
              icon="&#128694;"
              label="Total Miles"
              value={stats.totalMiles.toFixed(1)}
              unit="mi"
            />
            <StatCard
              icon="&#9968;"
              label="Highest Camp"
              value={stats.highestCamp.toLocaleString()}
              unit="ft"
            />
            <StatCard
              icon="&#127942;"
              label="Most Trips"
              value={
                stats.topAttendees.length > 1
                  ? `${stats.topAttendees.length} tied`
                  : stats.mostTripsAttendee?.name || '-'
              }
              unit={stats.mostTripsAttendee ? `(${stats.mostTripsAttendee.count})` : ''}
            />
          </div>
        )}

        {/* Timeline */}
        {trips.length === 0 ? (
          <div className="text-center py-12 text-stone-500">
            No past trips recorded yet.
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line (desktop only) */}
            <div className="hidden md:block absolute left-10 top-0 bottom-0 w-0.5 bg-stone-200" />

            {trips.map((trip, index) => (
              <TripCard
                key={trip.id}
                trip={trip}
                tripNumber={trips.length - index}
                onMapClick={handleMapClick}
                hideMapThumbnail={!!expandedMap}
              />
            ))}

            {/* Timeline end marker */}
            <div className="hidden md:flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-stone-100 border-2 border-stone-200 flex items-center justify-center">
                <span className="text-xl">&#127793;</span>
              </div>
              <p className="mt-2 text-sm text-stone-400">The beginning</p>
            </div>
          </div>
        )}
      </div>

      {/* Full screen map modal */}
      {expandedMap && (
        <FullScreenMap
          latitude={expandedMap.lat}
          longitude={expandedMap.lng}
          locationName={expandedMap.name}
          onClose={() => setExpandedMap(null)}
        />
      )}
    </AppShell>
  )
}
