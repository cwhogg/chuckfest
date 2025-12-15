import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/trip-years
 *
 * List all trip years, optionally filter by status
 * Query params: ?current=true to get the most recent active trip year
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const current = searchParams.get('current') === 'true'

    if (current) {
      // Get the most recent trip year that isn't completed
      const { data, error } = await supabase
        .from('trip_years')
        .select('*')
        .neq('status', 'completed')
        .order('year', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return NextResponse.json({
        success: true,
        tripYear: data || null
      })
    }

    // Get all trip years
    const { data, error } = await supabase
      .from('trip_years')
      .select('*')
      .order('year', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      tripYears: data
    })
  } catch (error) {
    console.error('Error in GET /api/trip-years:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/trip-years
 *
 * Create a new trip year
 * Body: { year: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { year } = body

    if (!year) {
      return NextResponse.json(
        { success: false, error: 'year is required' },
        { status: 400 }
      )
    }

    // Check if trip year already exists
    const { data: existing } = await supabase
      .from('trip_years')
      .select('id')
      .eq('year', year)
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Trip year ${year} already exists` },
        { status: 400 }
      )
    }

    // Create the trip year
    const { data, error } = await supabase
      .from('trip_years')
      .insert({
        year,
        status: 'planning'
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: `Created trip year ${year}`,
      tripYear: data
    })
  } catch (error) {
    console.error('Error in POST /api/trip-years:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
