import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { updateReminderStatus } from '@/lib/permits'
import type { PermitReminderStatus } from '@/lib/types'

const VALID_STATUSES: PermitReminderStatus[] = [
  'pending',
  'reminder_sent',
  'booked',
  'missed',
  'cancelled'
]

/**
 * GET /api/permit-reminders/[id]
 *
 * Get a single permit reminder by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { data, error } = await supabase
      .from('permit_reminders')
      .select(`
        *,
        site:sites(*),
        trip_year:trip_years(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Reminder not found' },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      reminder: data
    })
  } catch (error) {
    console.error('Error in GET /api/permit-reminders/[id]:', error)
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
 * PATCH /api/permit-reminders/[id]
 *
 * Update a permit reminder's status and/or reminder_datetime
 * Body: { status?: "pending" | "reminder_sent" | "booked" | "missed" | "cancelled", reminder_datetime?: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, reminder_datetime } = body

    if (!status && !reminder_datetime) {
      return NextResponse.json(
        { success: false, error: 'status or reminder_datetime is required' },
        { status: 400 }
      )
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
        },
        { status: 400 }
      )
    }

    // Build update object
    const updateData: { status?: string; reminder_datetime?: string } = {}
    if (status) updateData.status = status
    if (reminder_datetime) updateData.reminder_datetime = reminder_datetime

    const { data, error } = await supabase
      .from('permit_reminders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: `Reminder updated`,
      reminder: data
    })
  } catch (error) {
    console.error('Error in PATCH /api/permit-reminders/[id]:', error)

    // Check for not found
    if (error instanceof Error && error.message.includes('No rows')) {
      return NextResponse.json(
        { success: false, error: 'Reminder not found' },
        { status: 404 }
      )
    }

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
 * DELETE /api/permit-reminders/[id]
 *
 * Delete a permit reminder
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { error } = await supabase
      .from('permit_reminders')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Reminder deleted'
    })
  } catch (error) {
    console.error('Error in DELETE /api/permit-reminders/[id]:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
