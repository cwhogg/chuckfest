import { NextResponse } from 'next/server'
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
