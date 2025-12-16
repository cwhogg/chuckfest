import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

type AvailabilityStatus = 'available' | 'unavailable' | 'maybe'

/**
 * POST /api/dates/availability
 *
 * Upserts a member's availability for a date option
 * Body: { memberId: string, dateOptionId: string, status: 'available' | 'unavailable' | 'maybe' | null }
 * If status is null, removes the response
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { memberId, dateOptionId, status } = body

    if (!memberId || !dateOptionId) {
      return NextResponse.json(
        { success: false, error: 'memberId and dateOptionId are required' },
        { status: 400 }
      )
    }

    // Validate status if provided
    const validStatuses: AvailabilityStatus[] = ['available', 'unavailable', 'maybe']
    if (status !== null && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Must be available, unavailable, maybe, or null' },
        { status: 400 }
      )
    }

    // Check if availability already exists
    const { data: existing, error: existingError } = await supabase
      .from('date_availability')
      .select('id')
      .eq('member_id', memberId)
      .eq('date_option_id', dateOptionId)
      .maybeSingle()

    if (existingError) {
      throw existingError
    }

    // If status is null, delete the response
    if (status === null) {
      if (existing) {
        const { error: deleteError } = await supabase
          .from('date_availability')
          .delete()
          .eq('id', existing.id)

        if (deleteError) {
          throw deleteError
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Availability removed'
      })
    }

    // Upsert the availability
    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('date_availability')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        throw error
      }

      return NextResponse.json({
        success: true,
        availability: data
      })
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('date_availability')
        .insert({
          member_id: memberId,
          date_option_id: dateOptionId,
          status
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      return NextResponse.json({
        success: true,
        availability: data
      })
    }
  } catch (error) {
    console.error('Error in POST /api/dates/availability:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/dates/availability
 *
 * Bulk update availability for a member
 * Body: { memberId: string, updates: { dateOptionId: string, status: 'available' | 'unavailable' | 'maybe' | null }[] }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { memberId, updates } = body

    if (!memberId || !Array.isArray(updates)) {
      return NextResponse.json(
        { success: false, error: 'memberId and updates array are required' },
        { status: 400 }
      )
    }

    const results = []

    for (const update of updates) {
      const { dateOptionId, status } = update

      if (!dateOptionId) continue

      // Check if availability already exists
      const { data: existing } = await supabase
        .from('date_availability')
        .select('id')
        .eq('member_id', memberId)
        .eq('date_option_id', dateOptionId)
        .maybeSingle()

      if (status === null) {
        // Delete if exists
        if (existing) {
          await supabase
            .from('date_availability')
            .delete()
            .eq('id', existing.id)
        }
        results.push({ dateOptionId, action: 'deleted' })
      } else if (existing) {
        // Update
        await supabase
          .from('date_availability')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
        results.push({ dateOptionId, action: 'updated', status })
      } else {
        // Insert
        await supabase
          .from('date_availability')
          .insert({ member_id: memberId, date_option_id: dateOptionId, status })
        results.push({ dateOptionId, action: 'created', status })
      }
    }

    return NextResponse.json({
      success: true,
      results
    })
  } catch (error) {
    console.error('Error in PUT /api/dates/availability:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
