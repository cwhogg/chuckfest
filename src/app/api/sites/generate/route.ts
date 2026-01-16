import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getEntrancesForWilderness, verifyEntryPoint } from '@/lib/ridb'

/**
 * Hardcoded entry point mappings based on research
 * These are checked FIRST before falling back to RIDB API
 */
const HARDCODED_ENTRY_POINTS: { pattern: RegExp; entryPoint: string; region?: RegExp }[] = [
  // Inyo National Forest / John Muir Wilderness / Ansel Adams Wilderness
  { pattern: /ediza/i, entryPoint: 'High Trail' },
  { pattern: /thousand island/i, entryPoint: 'High Trail' },
  { pattern: /shadow lake/i, entryPoint: 'High Trail' },
  { pattern: /garnet lake/i, entryPoint: 'High Trail' },
  { pattern: /big pine/i, entryPoint: 'Big Pine Creek North Fork' },
  { pattern: /chickenfoot|little lakes valley|gem lakes/i, entryPoint: 'Mono Pass' },
  { pattern: /cottonwood lake/i, entryPoint: 'Cottonwood Lakes' },
  { pattern: /kearsarge/i, entryPoint: 'Kearsarge Pass' },
  { pattern: /long lake.*bishop|bishop.*long lake/i, entryPoint: 'Bishop Pass' },
  { pattern: /bishop pass/i, entryPoint: 'Bishop Pass' },
  { pattern: /sabrina/i, entryPoint: 'Sabrina' },
  { pattern: /piute/i, entryPoint: 'Piute Pass' },
  { pattern: /duck lake|duck pass|purple lake|lake virginia/i, entryPoint: 'Duck Pass' },
  { pattern: /mcgee/i, entryPoint: 'McGee Pass' },
  { pattern: /hilton lakes/i, entryPoint: 'Hilton Lakes' },
  { pattern: /evolution/i, entryPoint: 'Piute Pass' },
  // Desolation Wilderness
  { pattern: /velma/i, entryPoint: 'Bayview', region: /desolation/i },
  { pattern: /gilmore/i, entryPoint: 'Glen Alpine', region: /desolation/i },
  { pattern: /aloha|tamarack/i, entryPoint: 'Echo Lakes', region: /desolation/i },
  { pattern: /susie/i, entryPoint: 'Glen Alpine', region: /desolation/i },
  // Hoover Wilderness
  { pattern: /green lake|east lake/i, entryPoint: 'Green Creek', region: /hoover/i },
  { pattern: /virginia/i, entryPoint: 'Virginia Lakes', region: /hoover/i },
  { pattern: /20 lakes|saddlebag/i, entryPoint: 'Saddlebag Lake', region: /hoover/i },
  // Sequoia & Kings Canyon
  { pattern: /pear lake|heather lake|aster lake/i, entryPoint: 'Lakes Trail (Wolverton)', region: /sequoia|kings canyon/i },
  { pattern: /mosquito lake/i, entryPoint: 'Mosquito Lakes #1-5', region: /sequoia|mineral king/i },
  { pattern: /redwood canyon/i, entryPoint: 'Redwood Canyon' },
  { pattern: /bearpaw/i, entryPoint: 'High Sierra Trail' },
  { pattern: /rae lakes/i, entryPoint: 'Woods Creek', region: /kings canyon/i },
  // Yosemite Wilderness
  { pattern: /matterhorn/i, entryPoint: 'Twin Lakes', region: /yosemite/i },
  // Dinkey Lakes Wilderness
  { pattern: /cliff lake|dinkey/i, entryPoint: 'Dinkey Lakes' },
]

/**
 * Look up entry point from hardcoded mappings
 */
function getHardcodedEntryPoint(siteName: string, region: string): string | null {
  for (const mapping of HARDCODED_ENTRY_POINTS) {
    if (mapping.pattern.test(siteName)) {
      // Check region constraint if specified
      if (mapping.region && !mapping.region.test(region)) {
        continue
      }
      return mapping.entryPoint
    }
  }
  return null
}

interface GeneratedSite {
  name: string
  region: string
  description: string
  latitude: number
  longitude: number
  permit_url: string
  permit_type: string
  permit_advance_days: number
  permit_open_time: string
  permit_cost: number
  permit_entry_point: string
  difficulty: string
  distance_miles: number
  elevation_gain_ft: number
  peak_elevation_ft: number
  permit_notes: string
  trail_info_url: string
}

/**
 * POST /api/sites/generate
 *
 * Generate site details using OpenAI
 * Body: { name: string, imageUrl: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, imageUrl } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Site name is required' },
        { status: 400 }
      )
    }

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Image URL is required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const prompt = `You are a hiking and backpacking expert for California's Sierra Nevada region.

Given this backpacking destination name: "${name}"

Research and provide accurate details about this location. Return a JSON object with:

{
  "name": "Full official name of the destination",
  "region": "Geographic region (e.g., 'Eastern Sierra - John Muir Wilderness', 'Desolation Wilderness')",
  "description": "2-3 compelling sentences describing the destination, its scenery, and appeal for backpackers",
  "latitude": <decimal latitude>,
  "longitude": <decimal longitude>,
  "permit_url": "URL to recreation.gov or relevant permit page for this wilderness area",
  "permit_type": "rolling" or "fixed_date" or "lottery",
  "permit_advance_days": <number of days in advance permits open, typically 168 or 180 for Sierra wilderness>,
  "permit_open_time": "07:00",
  "permit_cost": <approximate cost in dollars>,
  "permit_entry_point": "The exact trailhead or entry point name to select when booking the permit (e.g., 'Agnew Meadows', 'Rush Creek', 'Lyell Canyon')",
  "difficulty": "easy" or "moderate" or "strenuous",
  "distance_miles": <one-way hike distance to the destination>,
  "elevation_gain_ft": <total elevation gain>,
  "peak_elevation_ft": <elevation of the campsite/destination>,
  "permit_notes": "Any important notes about permits, bear canisters, quotas, etc.",
  "trail_info_url": "URL to the AllTrails page for this trail/hike, or empty string if not found"
}

IMPORTANT for permit_entry_point: This is the EXACT entry point name as it appears in the recreation.gov permit system dropdown - NOT the physical trailhead name. These are often different!

To find this:
1. Search for first-person trip reports, blog posts, or forum discussions from people who camped at this destination
2. Look for what permit entry point they actually booked on recreation.gov
3. The entry point name must match exactly what appears in the recreation.gov system

Examples of the difference between physical trailhead vs permit entry point:
- Ediza Lake: Physical trailhead is "Agnew Meadows", but permit entry point is "High Trail"
- Thousand Island Lake: Physical trailhead is "Agnew Meadows", but permit entry point is "High Trail" or "River Trail"
- Cathedral Lakes: Entry point is "Cathedral Lakes" (same as destination)

Common John Muir Wilderness entry points: High Trail, River Trail, Duck Pass, Mammoth Pass, McGee Pass, Piute Pass, Bishop Pass, etc.
Common Ansel Adams Wilderness entry points: Fernandez, Norris, Lillian Lake Loop, etc.

If unsure, leave this field empty rather than guessing wrong.

Be accurate with coordinates and permit information. If you're unsure about specific permit details, use reasonable defaults for Sierra Nevada wilderness areas (typically rolling permits, 168 days advance, 7am PT opening).

IMPORTANT: Return ONLY the JSON object, no additional text or markdown formatting.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that provides accurate information about Sierra Nevada backpacking destinations. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    })

    const responseText = completion.choices[0]?.message?.content?.trim()

    if (!responseText) {
      return NextResponse.json(
        { success: false, error: 'No response from AI' },
        { status: 500 }
      )
    }

    // Parse the JSON response
    let generatedData: GeneratedSite
    try {
      // Remove any markdown code blocks if present
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      generatedData = JSON.parse(cleanedResponse)
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText)
      return NextResponse.json(
        { success: false, error: "Couldn't parse AI response. Try again." },
        { status: 500 }
      )
    }

    // Validate required fields
    if (!generatedData.name || !generatedData.region || !generatedData.description) {
      return NextResponse.json(
        { success: false, error: "Couldn't find details for this location. Try a more specific name." },
        { status: 400 }
      )
    }

    // HYBRID APPROACH: Check hardcoded mappings first, then fall back to RIDB
    let entryPointVerified = false
    let availableEntryPoints: { id: string; name: string }[] = []
    let entryPointSource: 'hardcoded' | 'ridb' | 'ai' | null = null

    // Step 1: Check hardcoded mappings first (most reliable)
    const hardcodedEntryPoint = getHardcodedEntryPoint(generatedData.name, generatedData.region)

    if (hardcodedEntryPoint) {
      generatedData.permit_entry_point = hardcodedEntryPoint
      entryPointVerified = true
      entryPointSource = 'hardcoded'
      console.log(`Entry point from hardcoded mapping: ${hardcodedEntryPoint}`)
    }

    // Step 2: If no hardcoded match, try RIDB API
    if (!entryPointVerified && process.env.RIDB_API_KEY && generatedData.region) {
      try {
        // Get available entry points for this wilderness area
        const entrances = await getEntrancesForWilderness(generatedData.region)

        if (entrances.length > 0) {
          availableEntryPoints = entrances.map(e => ({
            id: e.PermitEntranceID,
            name: e.PermitEntranceName,
          }))

          // Verify the AI's suggested entry point against RIDB
          if (generatedData.permit_entry_point) {
            const verified = await verifyEntryPoint(
              generatedData.permit_entry_point,
              generatedData.region
            )

            if (verified) {
              // Use the exact name from RIDB
              generatedData.permit_entry_point = verified.PermitEntranceName
              entryPointVerified = true
              entryPointSource = 'ridb'
              console.log(`Entry point verified via RIDB: ${verified.PermitEntranceName}`)
            } else {
              // AI's suggestion not found - clear it so user can select from dropdown
              console.log(`Entry point "${generatedData.permit_entry_point}" not found in RIDB, clearing for user selection`)
              generatedData.permit_entry_point = ''
            }
          }
        }
      } catch (error) {
        console.error('Error verifying entry point with RIDB:', error)
        // Continue without verification - user can still select manually
      }
    }

    // Step 3: If we still have an unverified AI suggestion (no RIDB key), keep it but mark unverified
    if (!entryPointVerified && generatedData.permit_entry_point) {
      entryPointSource = 'ai'
      console.log(`Entry point from AI (unverified): ${generatedData.permit_entry_point}`)
    }

    // Return the generated data with the provided image URL
    return NextResponse.json({
      success: true,
      site: {
        ...generatedData,
        photos: [imageUrl],
        status: 'active',
      },
      entryPointVerified,
      entryPointSource,
      availableEntryPoints: availableEntryPoints.length > 0 ? availableEntryPoints : undefined,
    })
  } catch (error) {
    console.error('Error in POST /api/sites/generate:', error)

    // Handle rate limits
    if (error instanceof OpenAI.RateLimitError) {
      return NextResponse.json(
        { success: false, error: 'AI service is busy. Please try again in a moment.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
