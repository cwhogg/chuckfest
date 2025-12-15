import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/sites
 *
 * Get all sites
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      sites: data
    })
  } catch (error) {
    console.error('Error in GET /api/sites:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
