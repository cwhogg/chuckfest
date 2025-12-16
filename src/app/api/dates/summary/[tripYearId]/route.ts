import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/dates/summary/[tripYearId]
 *
 * Returns a summary of date availability:
 * - Which dates have the most availability
 * - Who hasn't responded yet
 * - Best dates ranked by score
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

    // Get all date options with their availability
    const { data: dateOptions, error: optionsError } = await supabase
      .from('date_options')
      .select(`
        id,
        label,
        start_date,
        end_date,
        date_availability (
          member_id,
          status
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
      .select('id, name')
      .eq('is_active', true)

    if (membersError) {
      throw membersError
    }

    // Calculate stats for each date
    const dateStats = dateOptions?.map(option => {
      const availability = option.date_availability || []
      const availableCount = availability.filter((a: { status: string }) => a.status === 'available').length
      const maybeCount = availability.filter((a: { status: string }) => a.status === 'maybe').length
      const unavailableCount = availability.filter((a: { status: string }) => a.status === 'unavailable').length

      return {
        id: option.id,
        label: option.label,
        startDate: option.start_date,
        endDate: option.end_date,
        available: availableCount,
        maybe: maybeCount,
        unavailable: unavailableCount,
        score: availableCount + (maybeCount * 0.5)
      }
    }) || []

    // Sort by score descending
    const rankedDates = [...dateStats].sort((a, b) => b.score - a.score)

    // Find members who haven't responded to ANY dates
    const respondedMemberIds = new Set<string>()
    dateOptions?.forEach(option => {
      option.date_availability?.forEach((a: { member_id: string }) => {
        respondedMemberIds.add(a.member_id)
      })
    })

    const notRespondedMembers = members?.filter(m => !respondedMemberIds.has(m.id)) || []

    // Find the best date(s) - all dates tied for the highest score
    const topScore = rankedDates.length > 0 ? rankedDates[0].score : 0
    const bestDates = rankedDates.filter(d => d.score === topScore && topScore > 0)

    return NextResponse.json({
      success: true,
      summary: {
        totalMembers: members?.length || 0,
        respondedCount: respondedMemberIds.size,
        notRespondedMembers,
        bestDates,
        rankedDates,
        tripYear: {
          id: tripYear.id,
          year: tripYear.year,
          status: tripYear.status,
          deadline: tripYear.date_voting_deadline
        }
      }
    })
  } catch (error) {
    console.error('Error in GET /api/dates/summary/[tripYearId]:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
