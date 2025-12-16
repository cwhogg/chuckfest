import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/attendance
 *
 * Get all attendance records for the current trip year
 * Query params: tripYearId (optional - defaults to current trip year)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let tripYearId = searchParams.get('tripYearId')

    // If no tripYearId provided, get current trip year
    if (!tripYearId) {
      const { data: tripYear, error: tripYearError } = await supabase
        .from('trip_years')
        .select('id')
        .order('year', { ascending: false })
        .limit(1)
        .single()

      if (tripYearError && tripYearError.code !== 'PGRST116') {
        throw tripYearError
      }

      if (!tripYear) {
        return NextResponse.json({
          success: true,
          attendance: [],
          tripYearId: null
        })
      }

      tripYearId = tripYear.id
    }

    // Fetch attendance with member info
    const { data: attendance, error } = await supabase
      .from('trip_attendance')
      .select(`
        id,
        trip_year_id,
        member_id,
        status,
        notes,
        created_at,
        updated_at,
        members (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('trip_year_id', tripYearId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Flatten the member data
    const formattedAttendance = (attendance || []).map((a: Record<string, unknown>) => ({
      id: a.id,
      trip_year_id: a.trip_year_id,
      member_id: a.member_id,
      status: a.status,
      notes: a.notes,
      created_at: a.created_at,
      updated_at: a.updated_at,
      member: a.members
    }))

    return NextResponse.json({
      success: true,
      attendance: formattedAttendance,
      tripYearId
    })
  } catch (error) {
    console.error('Error in GET /api/attendance:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/attendance
 *
 * Create or update attendance record for a member
 * Body: { memberId, status: 'in' | 'out' | 'maybe', notes?: string, tripYearId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { memberId, status, notes } = body
    let { tripYearId } = body

    if (!memberId) {
      return NextResponse.json(
        { success: false, error: 'memberId is required' },
        { status: 400 }
      )
    }

    if (!status || !['in', 'out', 'maybe'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'status must be one of: in, out, maybe' },
        { status: 400 }
      )
    }

    // If no tripYearId provided, get current trip year
    if (!tripYearId) {
      const { data: tripYear, error: tripYearError } = await supabase
        .from('trip_years')
        .select('id')
        .order('year', { ascending: false })
        .limit(1)
        .single()

      if (tripYearError) {
        if (tripYearError.code === 'PGRST116') {
          return NextResponse.json(
            { success: false, error: 'No trip year found' },
            { status: 404 }
          )
        }
        throw tripYearError
      }

      tripYearId = tripYear.id
    }

    // Upsert attendance record
    const { data, error } = await supabase
      .from('trip_attendance')
      .upsert(
        {
          trip_year_id: tripYearId,
          member_id: memberId,
          status,
          notes: notes || null,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'trip_year_id,member_id'
        }
      )
      .select(`
        id,
        trip_year_id,
        member_id,
        status,
        notes,
        created_at,
        updated_at
      `)
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Attendance updated',
      attendance: data
    })
  } catch (error) {
    console.error('Error in POST /api/attendance:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
