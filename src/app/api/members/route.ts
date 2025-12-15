import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/members
 *
 * Get all members
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      members: data
    })
  } catch (error) {
    console.error('Error in GET /api/members:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/members
 *
 * Create a new member
 * Body: { name: string, email: string, phone?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone } = body

    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'name and email are required' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from('members')
      .select('id')
      .eq('email', email)
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A member with this email already exists' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('members')
      .insert({
        name,
        email,
        phone: phone || null,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: `Added member ${name}`,
      member: data
    })
  } catch (error) {
    console.error('Error in POST /api/members:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
