import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import {
  getUpcomingReminders,
  getDueReminders,
  generatePermitReminders,
  insertPermitReminders
} from '@/lib/permits'
import type { TripYear, Site } from '@/lib/types'

/**
 * GET /api/permit-reminders
 *
 * Query params:
 *   - tripYearId=xxx: Filter by trip year
 *   - upcoming=true: Get reminders due in the next 30 days
 *   - due=true: Get reminders ready to send now
 *   - days=N: Number of days to look ahead (with upcoming=true)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tripYearId = searchParams.get('tripYearId')
    const upcoming = searchParams.get('upcoming') === 'true'
    const due = searchParams.get('due') === 'true'
    const days = parseInt(searchParams.get('days') || '30', 10)

    if (due) {
      const reminders = await getDueReminders()
      return NextResponse.json({
        success: true,
        count: reminders.length,
        reminders
      })
    }

    if (upcoming) {
      const reminders = await getUpcomingReminders(days)
      return NextResponse.json({
        success: true,
        count: reminders.length,
        days,
        reminders
      })
    }

    // Build query
    let query = supabase
      .from('permit_reminders')
      .select(`
        *,
        site:sites(*)
      `)
      .order('reminder_datetime', { ascending: true })

    // Filter by trip year if provided
    if (tripYearId) {
      query = query.eq('trip_year_id', tripYearId)
    } else {
      // Default: only pending
      query = query.eq('status', 'pending')
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      count: data.length,
      reminders: data
    })
  } catch (error) {
    console.error('Error in GET /api/permit-reminders:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/permit-reminders/generate
 *
 * Body: { tripYearId: string, siteIds: string[] }
 *
 * Generates permit reminders for the given trip year and sites
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tripYearId, siteIds } = body

    if (!tripYearId) {
      return NextResponse.json(
        { success: false, error: 'tripYearId is required' },
        { status: 400 }
      )
    }

    if (!siteIds || !Array.isArray(siteIds) || siteIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'siteIds array is required' },
        { status: 400 }
      )
    }

    // Fetch the trip year
    const { data: tripYearData, error: tripYearError } = await supabase
      .from('trip_years')
      .select('*')
      .eq('id', tripYearId)
      .single()

    if (tripYearError || !tripYearData) {
      return NextResponse.json(
        { success: false, error: 'Trip year not found' },
        { status: 404 }
      )
    }

    const tripYear = tripYearData as TripYear

    if (!tripYear.final_start_date) {
      return NextResponse.json(
        { success: false, error: 'Trip year must have final_start_date set' },
        { status: 400 }
      )
    }

    // Fetch the sites
    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select('*')
      .in('id', siteIds)

    if (sitesError) {
      throw sitesError
    }

    if (!sites || sites.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid sites found' },
        { status: 404 }
      )
    }

    // Generate the reminders
    const reminderInserts = generatePermitReminders(
      tripYear,
      sites as Site[]
    )

    if (reminderInserts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No reminders generated (all permit dates may be in the past)',
        created: []
      })
    }

    // Insert into database
    const created = await insertPermitReminders(reminderInserts)

    return NextResponse.json({
      success: true,
      message: `Created ${created.length} permit reminders`,
      created
    })
  } catch (error) {
    console.error('Error in POST /api/permit-reminders:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
