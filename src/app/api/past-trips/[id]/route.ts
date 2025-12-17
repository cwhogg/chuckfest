import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * PATCH /api/past-trips/[id]
 *
 * Update a past trip (for admin to set cover photo, album URL, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Only allow updating specific fields
    const allowedFields = [
      'cover_photo_url',
      'album_url',
      'notes',
      'location_name',
      'hike_miles',
      'elevation_gain_ft',
      'campsite_elevation_ft'
    ]

    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('past_trips')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Supabase error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json(
        { success: false, error: error.message || `Database error: ${error.code}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      trip: data
    })
  } catch (error) {
    console.error('Error in PATCH /api/past-trips/[id]:', error)
    let errorMessage = 'Unknown error'
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String(error.message)
    } else if (error && typeof error === 'object' && 'code' in error) {
      errorMessage = `Database error: ${String(error.code)}`
    }
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
