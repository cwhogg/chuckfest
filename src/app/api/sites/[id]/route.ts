import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/sites/[id]
 *
 * Get a single site with vote count and comments
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const tripYearId = searchParams.get('tripYearId')

    // Get the site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('*')
      .eq('id', id)
      .single()

    if (siteError) {
      if (siteError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Site not found' },
          { status: 404 }
        )
      }
      throw siteError
    }

    // Get vote count for this site (optionally filtered by trip year)
    let voteQuery = supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', id)

    if (tripYearId) {
      voteQuery = voteQuery.eq('trip_year_id', tripYearId)
    }

    const { count: voteCount } = await voteQuery

    // Get voters for this site
    let votersQuery = supabase
      .from('votes')
      .select(`
        id,
        member:members(id, name)
      `)
      .eq('site_id', id)

    if (tripYearId) {
      votersQuery = votersQuery.eq('trip_year_id', tripYearId)
    }

    const { data: voters } = await votersQuery

    // Get comments for this site
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select(`
        *,
        member:members(id, name)
      `)
      .eq('site_id', id)
      .order('created_at', { ascending: true })

    if (commentsError) {
      throw commentsError
    }

    return NextResponse.json({
      success: true,
      site: {
        ...site,
        vote_count: voteCount || 0,
        voters: voters || [],
        comments: comments || []
      }
    })
  } catch (error) {
    console.error('Error in GET /api/sites/[id]:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/sites/[id]
 *
 * Update a site (photos, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Only allow updating certain fields
    const allowedFields = ['photos', 'description', 'difficulty', 'distance_miles', 'elevation_gain_ft', 'peak_elevation_ft']
    const updates: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
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
      .from('sites')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Site updated',
      site: data
    })
  } catch (error) {
    console.error('Error in PATCH /api/sites/[id]:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
