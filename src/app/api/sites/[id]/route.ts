import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/sites/[id]
 *
 * Get a single site with vote count, voters, ranking, and comments
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    // Get voters for this site with member details
    // Note: votes table doesn't have trip_year_id - votes are global
    const { data: votersData } = await supabase
      .from('votes')
      .select(`
        id,
        member:members(id, name, avatar_url)
      `)
      .eq('site_id', id)

    // Transform voters to flatten member data
    const voters = votersData?.map(v => v.member).filter(Boolean) || []
    const voteCount = voters.length

    // Get all votes for ranking calculation
    const { data: allVotes } = await supabase
      .from('votes')
      .select('site_id')

    // Count votes per site
    const voteCountMap: Record<string, number> = {}
    if (allVotes) {
      for (const vote of allVotes) {
        voteCountMap[vote.site_id] = (voteCountMap[vote.site_id] || 0) + 1
      }
    }

    // Get total number of active sites
    const { count: totalSites } = await supabase
      .from('sites')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    // Calculate ranking (sites sorted by vote count descending)
    const sitesWithVotes = Object.entries(voteCountMap)
      .map(([siteId, votes]) => ({ siteId, votes }))
      .sort((a, b) => b.votes - a.votes)

    // Find this site's rank (only if it has votes)
    let rank: number | null = null
    let isTied = false

    if (voteCount > 0) {
      // Find position in sorted list
      const position = sitesWithVotes.findIndex(s => s.siteId === id)
      if (position !== -1) {
        // Calculate actual rank (accounting for ties)
        rank = 1
        for (let i = 0; i < position; i++) {
          if (sitesWithVotes[i].votes > sitesWithVotes[position].votes) {
            rank++
          }
        }

        // Check if tied with other sites
        const currentVotes = sitesWithVotes[position].votes
        const sitesWithSameVotes = sitesWithVotes.filter(s => s.votes === currentVotes)
        isTied = sitesWithSameVotes.length > 1
      }
    }

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
        vote_count: voteCount,
        voters: voters,
        rank: rank,
        is_tied: isTied,
        total_sites: totalSites || 0,
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
 * DELETE /api/sites/[id]
 *
 * Delete a site
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { error } = await supabase
      .from('sites')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Site deleted'
    })
  } catch (error) {
    console.error('Error in DELETE /api/sites/[id]:', error)
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
    const allowedFields = ['photos', 'description', 'difficulty', 'distance_miles', 'elevation_gain_ft', 'peak_elevation_ft', 'national_forest', 'trail_info_url']
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
