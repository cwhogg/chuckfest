import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/past-trips
 *
 * Returns all past trips ordered by year DESC
 * Includes attendees with member details and linked site if exists
 */
export async function GET() {
  try {
    // Get all past trips with their attendees and site info
    const { data: trips, error } = await supabase
      .from('past_trips')
      .select(`
        *,
        site:sites(id, name, photos, latitude, longitude),
        past_trip_attendees(
          id,
          member:members(id, name, email)
        )
      `)
      .order('year', { ascending: false })

    if (error) {
      throw error
    }

    // Transform the data to flatten attendees
    const transformedTrips = trips?.map(trip => ({
      ...trip,
      attendees: trip.past_trip_attendees
        ?.map((pta: { member: { id: string; name: string; email: string } }) => pta.member)
        .filter(Boolean)
        .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)) || [],
      past_trip_attendees: undefined // Remove the nested structure
    })) || []

    // Calculate aggregate stats
    const stats = {
      totalTrips: transformedTrips.length,
      totalMiles: transformedTrips.reduce((sum, t) => sum + (t.hike_miles || 0), 0),
      totalElevationGain: transformedTrips.reduce((sum, t) => sum + (t.elevation_gain_ft || 0), 0),
      highestCamp: Math.max(...transformedTrips.map(t => t.campsite_elevation_ft || 0)),
      lowestCamp: Math.min(...transformedTrips.filter(t => t.campsite_elevation_ft).map(t => t.campsite_elevation_ft)),
    }

    // Calculate attendance stats per member
    const attendanceCounts: Record<string, { name: string; count: number }> = {}
    transformedTrips.forEach(trip => {
      trip.attendees?.forEach((member: { id: string; name: string }) => {
        if (!attendanceCounts[member.id]) {
          attendanceCounts[member.id] = { name: member.name, count: 0 }
        }
        attendanceCounts[member.id].count++
      })
    })

    // Find member with most trips
    const sortedAttendance = Object.values(attendanceCounts).sort((a, b) => b.count - a.count)
    const mostTrips = sortedAttendance.length > 0 ? sortedAttendance[0] : null

    // Find all members tied for most trips
    const topAttendees = mostTrips
      ? sortedAttendance.filter(a => a.count === mostTrips.count)
      : []

    return NextResponse.json({
      success: true,
      trips: transformedTrips,
      stats: {
        ...stats,
        mostTripsAttendee: topAttendees.length === 1 ? topAttendees[0] : null,
        topAttendees: topAttendees
      }
    })
  } catch (error) {
    console.error('Error in GET /api/past-trips:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
