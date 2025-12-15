import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/date-options/generate
 *
 * Generate date options for a trip year
 * Creates 11 Wed-Sun options from June 1 - Aug 14
 *
 * Body: { tripYearId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tripYearId } = body

    if (!tripYearId) {
      return NextResponse.json(
        { success: false, error: 'tripYearId is required' },
        { status: 400 }
      )
    }

    // Get the trip year to find the year
    const { data: tripYear, error: tripYearError } = await supabase
      .from('trip_years')
      .select('year')
      .eq('id', tripYearId)
      .single()

    if (tripYearError || !tripYear) {
      return NextResponse.json(
        { success: false, error: 'Trip year not found' },
        { status: 404 }
      )
    }

    const year = tripYear.year

    // Check if date options already exist
    const { data: existing } = await supabase
      .from('date_options')
      .select('id')
      .eq('trip_year_id', tripYearId)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Date options already exist for this trip year. Delete them first to regenerate.' },
        { status: 400 }
      )
    }

    // Generate date options: Wed-Sun windows from June 1 to Aug 14
    // We want approximately 11 options, each starting on a Wednesday
    const dateOptions: { trip_year_id: string; start_date: string; end_date: string }[] = []

    // Find the first Wednesday on or after June 1
    let currentDate = new Date(year, 5, 1) // June 1 (month is 0-indexed)
    while (currentDate.getDay() !== 3) { // 3 = Wednesday
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Generate options until we pass Aug 14
    const endLimit = new Date(year, 7, 14) // Aug 14

    while (currentDate <= endLimit) {
      const startDate = new Date(currentDate)
      const endDate = new Date(currentDate)
      endDate.setDate(endDate.getDate() + 4) // Wed to Sun = 4 days later

      dateOptions.push({
        trip_year_id: tripYearId,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      })

      // Move to next Wednesday
      currentDate.setDate(currentDate.getDate() + 7)
    }

    // Insert all date options
    const { data, error } = await supabase
      .from('date_options')
      .insert(dateOptions)
      .select()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${data.length} date options for ${year}`,
      dateOptions: data
    })
  } catch (error) {
    console.error('Error in POST /api/date-options/generate:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
