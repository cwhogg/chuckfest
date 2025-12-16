import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const MAX_VOTES_PER_MEMBER = 5

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
 * Body: { memberId: string, siteId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { memberId, siteId } = body

    if (!memberId || !siteId) {
      return NextResponse.json(
        { success: false, error: 'memberId and siteId are required' },
        { status: 400 }
      )
    }

    // Check if user already voted for this site
    const { data: existingVote, error: existingError } = await supabase
      .from('votes')
      .select('id')
      .eq('member_id', memberId)
      .eq('site_id', siteId)
      .maybeSingle()

    if (existingError) {
      console.error('Error checking existing vote:', existingError)
      return NextResponse.json(
        { success: false, error: existingError.message },
        { status: 400 }
      )
    }

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

    if (countError) {
      console.error('Error counting votes:', countError)
      return NextResponse.json(
        { success: false, error: countError.message },
        { status: 400 }
      )
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
        site_id: siteId
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json(
        { success: false, error: error.message, details: error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Vote added',
      vote: data
    })
  } catch (error) {
    console.error('Error in POST /api/votes:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
