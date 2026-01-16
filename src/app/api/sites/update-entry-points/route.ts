import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * Known entry point mappings based on research
 * Maps site name patterns to the correct recreation.gov entry point
 */
const ENTRY_POINT_MAPPINGS: { pattern: RegExp; entryPoint: string; region?: RegExp }[] = [
  // Inyo National Forest / John Muir Wilderness / Ansel Adams Wilderness (233262)
  { pattern: /ediza/i, entryPoint: 'High Trail' },
  { pattern: /thousand island/i, entryPoint: 'High Trail' },
  { pattern: /shadow lake/i, entryPoint: 'High Trail' },
  { pattern: /garnet lake/i, entryPoint: 'High Trail' },
  { pattern: /big pine/i, entryPoint: 'Big Pine Creek North Fork' },
  { pattern: /chickenfoot|little lakes valley|gem lakes|long lake.*little/i, entryPoint: 'Mono Pass' },
  { pattern: /cottonwood lake/i, entryPoint: 'Cottonwood Lakes' },
  { pattern: /kearsarge/i, entryPoint: 'Kearsarge Pass' },
  { pattern: /long lake.*bishop|bishop.*long lake/i, entryPoint: 'Bishop Pass' },
  { pattern: /bishop pass/i, entryPoint: 'Bishop Pass' },
  { pattern: /sabrina/i, entryPoint: 'Sabrina' },
  { pattern: /piute/i, entryPoint: 'Piute Pass' },
  { pattern: /duck lake|duck pass/i, entryPoint: 'Duck Pass' },
  { pattern: /mcgee/i, entryPoint: 'McGee Pass' },
  { pattern: /hilton lakes/i, entryPoint: 'Hilton Lakes' },

  // Desolation Wilderness (233261)
  { pattern: /velma/i, entryPoint: 'Bayview', region: /desolation/i },
  { pattern: /gilmore/i, entryPoint: 'Glen Alpine', region: /desolation/i },
  { pattern: /aloha/i, entryPoint: 'Echo Lakes', region: /desolation/i },
  { pattern: /susie/i, entryPoint: 'Glen Alpine', region: /desolation/i },

  // Hoover Wilderness (445856)
  { pattern: /green lake|east lake/i, entryPoint: 'Green Creek', region: /hoover/i },
  { pattern: /virginia/i, entryPoint: 'Virginia Lakes', region: /hoover/i },

  // Sequoia & Kings Canyon (445857)
  { pattern: /pear lake|heather lake|aster lake/i, entryPoint: 'Lakes Trail (Wolverton)', region: /sequoia|kings canyon/i },
  { pattern: /mosquito lake/i, entryPoint: 'Mosquito Lakes #1-5', region: /sequoia|mineral king/i },
  { pattern: /redwood canyon/i, entryPoint: 'Redwood Canyon' },
  { pattern: /bearpaw/i, entryPoint: 'High Sierra Trail' },

  // Dinkey Lakes Wilderness (445858)
  { pattern: /cliff lake|dinkey/i, entryPoint: 'Dinkey Lakes' },

  // Emigrant Wilderness - no entry point needed (free permits)
  { pattern: /emigrant|bear lake.*emigrant/i, entryPoint: '' },
]

/**
 * POST /api/sites/update-entry-points
 *
 * One-time script to populate permit_entry_point for all sites
 */
export async function POST(request: NextRequest) {
  try {
    // Fetch all sites
    const { data: sites, error: fetchError } = await supabase
      .from('sites')
      .select('id, name, region, permit_entry_point')

    if (fetchError) {
      throw new Error(`Failed to fetch sites: ${fetchError.message}`)
    }

    const updates: { id: string; name: string; oldValue: string | null; newValue: string }[] = []
    const skipped: { id: string; name: string; reason: string }[] = []

    for (const site of sites || []) {
      // Skip if already has an entry point
      if (site.permit_entry_point) {
        skipped.push({ id: site.id, name: site.name, reason: 'Already has entry point' })
        continue
      }

      // Find matching entry point
      let entryPoint: string | null = null

      for (const mapping of ENTRY_POINT_MAPPINGS) {
        if (mapping.pattern.test(site.name)) {
          // Check region constraint if specified
          if (mapping.region && site.region && !mapping.region.test(site.region)) {
            continue
          }
          entryPoint = mapping.entryPoint
          break
        }
      }

      if (entryPoint === null) {
        skipped.push({ id: site.id, name: site.name, reason: 'No matching pattern found' })
        continue
      }

      if (entryPoint === '') {
        skipped.push({ id: site.id, name: site.name, reason: 'No entry point required (free permit)' })
        continue
      }

      // Update the site
      const { error: updateError } = await supabase
        .from('sites')
        .update({ permit_entry_point: entryPoint })
        .eq('id', site.id)

      if (updateError) {
        skipped.push({ id: site.id, name: site.name, reason: `Update failed: ${updateError.message}` })
      } else {
        updates.push({
          id: site.id,
          name: site.name,
          oldValue: site.permit_entry_point,
          newValue: entryPoint,
        })
      }
    }

    return NextResponse.json({
      success: true,
      updated: updates.length,
      skippedCount: skipped.length,
      updates,
      skipped,
    })
  } catch (error) {
    console.error('Error in POST /api/sites/update-entry-points:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/sites/update-entry-points
 *
 * Preview what would be updated (dry run)
 */
export async function GET() {
  try {
    // Fetch all sites
    const { data: sites, error: fetchError } = await supabase
      .from('sites')
      .select('id, name, region, permit_entry_point')

    if (fetchError) {
      throw new Error(`Failed to fetch sites: ${fetchError.message}`)
    }

    const preview: { name: string; region: string | null; currentEntryPoint: string | null; suggestedEntryPoint: string | null; status: string }[] = []

    for (const site of sites || []) {
      let suggestedEntryPoint: string | null = null
      let status = 'no_match'

      if (site.permit_entry_point) {
        status = 'already_set'
        suggestedEntryPoint = site.permit_entry_point
      } else {
        for (const mapping of ENTRY_POINT_MAPPINGS) {
          if (mapping.pattern.test(site.name)) {
            if (mapping.region && site.region && !mapping.region.test(site.region)) {
              continue
            }
            suggestedEntryPoint = mapping.entryPoint || '(none required)'
            status = mapping.entryPoint ? 'will_update' : 'free_permit'
            break
          }
        }
      }

      preview.push({
        name: site.name,
        region: site.region,
        currentEntryPoint: site.permit_entry_point,
        suggestedEntryPoint,
        status,
      })
    }

    return NextResponse.json({
      success: true,
      totalSites: sites?.length || 0,
      preview,
      summary: {
        willUpdate: preview.filter(p => p.status === 'will_update').length,
        alreadySet: preview.filter(p => p.status === 'already_set').length,
        freePermit: preview.filter(p => p.status === 'free_permit').length,
        noMatch: preview.filter(p => p.status === 'no_match').length,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/sites/update-entry-points:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
