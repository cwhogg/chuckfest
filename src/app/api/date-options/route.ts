import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/date-options
 *
 * Get date options for a trip year
 * Query params: ?tripYearId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tripYearId = searchParams.get('tripYearId')

    if (!tripYearId) {
      return NextResponse.json(
        { success: false, error: 'tripYearId is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('date_options')
      .select('*')
      .eq('trip_year_id', tripYearId)
      .order('start_date', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      dateOptions: data
    })
  } catch (error) {
    console.error('Error in GET /api/date-options:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
