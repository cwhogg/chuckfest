import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/dates/[tripYearId]
 *
 * Returns all date options for a trip year with member availability responses
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripYearId: string }> }
) {
  try {
    const { tripYearId } = await params

    // Get the trip year
    const { data: tripYear, error: tripYearError } = await supabase
      .from('trip_years')
      .select('*')
      .eq('id', tripYearId)
      .single()

    if (tripYearError || !tripYear) {
      return NextResponse.json(
        { success: false, error: 'Trip year not found' },
        { status: 404 }
      )
    }

    // Get all date options with their availability responses
    const { data: dateOptions, error: optionsError } = await supabase
      .from('date_options')
      .select(`
        *,
        date_availability (
          id,
          member_id,
          status,
          updated_at
        )
      `)
      .eq('trip_year_id', tripYearId)
      .order('start_date', { ascending: true })

    if (optionsError) {
      throw optionsError
    }

    // Get all active members
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id, name, email')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (membersError) {
      throw membersError
    }

    // Calculate summary stats for each date option
    const dateOptionsWithStats = dateOptions?.map(option => {
      const availability = option.date_availability || []
      const availableCount = availability.filter((a: { status: string }) => a.status === 'available').length
      const maybeCount = availability.filter((a: { status: string }) => a.status === 'maybe').length
      const unavailableCount = availability.filter((a: { status: string }) => a.status === 'unavailable').length
      const totalResponses = availability.length

      return {
        ...option,
        stats: {
          available: availableCount,
          maybe: maybeCount,
          unavailable: unavailableCount,
          totalResponses,
          score: availableCount + (maybeCount * 0.5) // Weight maybes at 0.5
        }
      }
    }) || []

    // Find the best date(s)
    const maxScore = Math.max(...dateOptionsWithStats.map(d => d.stats.score))
    const bestDates = dateOptionsWithStats
      .filter(d => d.stats.score === maxScore && maxScore > 0)
      .map(d => d.id)

    // Count members who have responded to at least one date
    const respondedMemberIds = new Set<string>()
    dateOptions?.forEach(option => {
      option.date_availability?.forEach((a: { member_id: string }) => {
        respondedMemberIds.add(a.member_id)
      })
    })

    return NextResponse.json({
      success: true,
      tripYear,
      dateOptions: dateOptionsWithStats,
      members,
      summary: {
        totalMembers: members?.length || 0,
        respondedCount: respondedMemberIds.size,
        bestDateIds: bestDates
      }
    })
  } catch (error) {
    console.error('Error in GET /api/dates/[tripYearId]:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
