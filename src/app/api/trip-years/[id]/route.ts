import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/trip-years/[id]
 *
 * Get a single trip year by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { data, error } = await supabase
      .from('trip_years')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Trip year not found' },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      tripYear: data
    })
  } catch (error) {
    console.error('Error in GET /api/trip-years/[id]:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/trip-years/[id]
 *
 * Update a trip year
 * Body: { status?, final_start_date?, final_end_date? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, final_start_date, final_end_date } = body

    // Validate dates are Wed-Sun if provided
    if (final_start_date && final_end_date) {
      const startDate = new Date(final_start_date + 'T12:00:00') // Noon to avoid timezone issues
      const endDate = new Date(final_end_date + 'T12:00:00')

      // Wednesday = 3, Sunday = 0
      if (startDate.getDay() !== 3) {
        return NextResponse.json(
          { success: false, error: 'Start date must be a Wednesday' },
          { status: 400 }
        )
      }
      if (endDate.getDay() !== 0) {
        return NextResponse.json(
          { success: false, error: 'End date must be a Sunday' },
          { status: 400 }
        )
      }

      // Check it's exactly 4 days (Wed to Sun)
      const daysDiff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff !== 4) {
        return NextResponse.json(
          { success: false, error: 'Trip must be exactly Wednesday through Sunday (4 days)' },
          { status: 400 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (final_start_date !== undefined) updateData.final_start_date = final_start_date
    if (final_end_date !== undefined) updateData.final_end_date = final_end_date

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No update fields provided' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('trip_years')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Trip year updated',
      tripYear: data
    })
  } catch (error) {
    console.error('Error in PATCH /api/trip-years/[id]:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/trip-years/[id]
 *
 * Delete a trip year
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { error } = await supabase
      .from('trip_years')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Trip year deleted'
    })
  } catch (error) {
    console.error('Error in DELETE /api/trip-years/[id]:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
