import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateDateOptions, formatDateForDB } from '@/lib/date-utils'

/**
 * POST /api/trip-years/[id]/generate-dates
 *
 * Generates date options for a trip year if they don't already exist.
 * Creates Wednesday-Sunday windows between June 1 and August 14.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripYearId } = await params

    // Get the trip year to find the year
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

    // Check if date options already exist for this trip year
    const { data: existingOptions, error: existingError } = await supabase
      .from('date_options')
      .select('id')
      .eq('trip_year_id', tripYearId)

    if (existingError) {
      throw existingError
    }

    if (existingOptions && existingOptions.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Date options already exist for this trip year' },
        { status: 400 }
      )
    }

    // Generate date options for this year
    const dateOptions = generateDateOptions(tripYear.year)

    // Insert all date options
    const insertData = dateOptions.map(option => ({
      trip_year_id: tripYearId,
      start_date: formatDateForDB(option.startDate),
      end_date: formatDateForDB(option.endDate),
      label: option.label
    }))

    const { data: createdOptions, error: insertError } = await supabase
      .from('date_options')
      .insert(insertData)
      .select()

    if (insertError) {
      throw insertError
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${createdOptions?.length || 0} date options`,
      dateOptions: createdOptions
    })
  } catch (error) {
    console.error('Error in POST /api/trip-years/[id]/generate-dates:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
