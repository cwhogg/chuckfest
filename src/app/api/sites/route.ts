import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/sites
 *
 * Get all sites with vote counts
 */
export async function GET() {
  try {
    // Get all sites
    const { data: sites, error } = await supabase
      .from('sites')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      throw error
    }

    // Get vote counts for each site
    const { data: votes } = await supabase
      .from('votes')
      .select('site_id')

    // Count votes per site
    const voteCountMap: Record<string, number> = {}
    if (votes) {
      for (const vote of votes) {
        voteCountMap[vote.site_id] = (voteCountMap[vote.site_id] || 0) + 1
      }
    }

    // Add vote counts to sites
    const sitesWithVotes = sites?.map(site => ({
      ...site,
      vote_count: voteCountMap[site.id] || 0
    })) || []

    return NextResponse.json({
      success: true,
      sites: sitesWithVotes
    })
  } catch (error) {
    console.error('Error in GET /api/sites:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sites
 *
 * Create a new site
 * Body: Site object with all fields
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Site name is required' },
        { status: 400 }
      )
    }

    // Prepare site data for insertion
    const siteData = {
      name: body.name,
      region: body.region || null,
      description: body.description || null,
      latitude: body.latitude || null,
      longitude: body.longitude || null,
      permit_url: body.permit_url || null,
      permit_type: body.permit_type || null,
      permit_advance_days: body.permit_advance_days || null,
      permit_open_time: body.permit_open_time || null,
      permit_cost: body.permit_cost || null,
      difficulty: body.difficulty || null,
      distance_miles: body.distance_miles || null,
      elevation_gain_ft: body.elevation_gain_ft || null,
      peak_elevation_ft: body.peak_elevation_ft || null,
      permit_notes: body.permit_notes || null,
      trail_info_url: body.trail_info_url || null,
      photos: body.photos || [],
      status: body.status || 'active',
    }

    const { data, error } = await supabase
      .from('sites')
      .insert(siteData)
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      site: data
    })
  } catch (error) {
    console.error('Error in POST /api/sites:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
