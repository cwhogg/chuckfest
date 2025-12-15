import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const MAX_VOTES_PER_MEMBER = 3

/**
 * GET /api/votes
 *
 * Get all votes, optionally filtered by member or site
 * Query params: ?memberId=xxx or ?siteId=xxx or ?tripYearId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')
    const siteId = searchParams.get('siteId')
    const tripYearId = searchParams.get('tripYearId')

    let query = supabase
      .from('votes')
      .select(`
        *,
        member:members(id, name),
        site:sites(id, name)
      `)

    if (memberId) {
      query = query.eq('member_id', memberId)
    }
    if (siteId) {
      query = query.eq('site_id', siteId)
    }
    if (tripYearId) {
      query = query.eq('trip_year_id', tripYearId)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      votes: data
    })
  } catch (error) {
    console.error('Error in GET /api/votes:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/votes
 *
 * Add a vote
 * Body: { memberId: string, siteId: string, tripYearId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { memberId, siteId, tripYearId } = body

    if (!memberId || !siteId || !tripYearId) {
      return NextResponse.json(
        { success: false, error: 'memberId, siteId, and tripYearId are required' },
        { status: 400 }
      )
    }

    // Check if user already voted for this site
    const { data: existingVote } = await supabase
      .from('votes')
      .select('id')
      .eq('member_id', memberId)
      .eq('site_id', siteId)
      .eq('trip_year_id', tripYearId)
      .single()

    if (existingVote) {
      return NextResponse.json(
        { success: false, error: 'You already voted for this site' },
        { status: 400 }
      )
    }

    // Check vote count for this member
    const { count, error: countError } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('member_id', memberId)
      .eq('trip_year_id', tripYearId)

    if (countError) {
      throw countError
    }

    if (count && count >= MAX_VOTES_PER_MEMBER) {
      return NextResponse.json(
        { success: false, error: `You can only vote for ${MAX_VOTES_PER_MEMBER} sites. Remove a vote first.` },
        { status: 400 }
      )
    }

    // Add the vote
    const { data, error } = await supabase
      .from('votes')
      .insert({
        member_id: memberId,
        site_id: siteId,
        trip_year_id: tripYearId
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Vote added',
      vote: data
    })
  } catch (error) {
    console.error('Error in POST /api/votes:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
