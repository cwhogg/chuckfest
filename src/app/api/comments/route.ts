import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/comments
 *
 * Get comments for a site
 * Query params: ?siteId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')

    if (!siteId) {
      return NextResponse.json(
        { success: false, error: 'siteId is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        member:members(id, name)
      `)
      .eq('site_id', siteId)
      .order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      comments: data
    })
  } catch (error) {
    console.error('Error in GET /api/comments:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/comments
 *
 * Add a comment to a site
 * Body: { memberId: string, siteId: string, text: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { memberId, siteId, text } = body

    if (!memberId || !siteId || !text) {
      return NextResponse.json(
        { success: false, error: 'memberId, siteId, and text are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        member_id: memberId,
        site_id: siteId,
        text: text.trim()
      })
      .select(`
        *,
        member:members(id, name)
      `)
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Comment added',
      comment: data
    })
  } catch (error) {
    console.error('Error in POST /api/comments:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
