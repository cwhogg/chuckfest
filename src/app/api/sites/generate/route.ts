import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getEntrancesForWilderness, verifyEntryPoint, PermitEntrance } from '@/lib/ridb'

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

    // Verify entry point against RIDB if we have an API key
    let entryPointVerified = false
    let availableEntryPoints: { id: string; name: string }[] = []

    if (process.env.RIDB_API_KEY && generatedData.region) {
      try {
        // Get available entry points for this wilderness area
        const entrances = await getEntrancesForWilderness(generatedData.region)

        if (entrances.length > 0) {
          availableEntryPoints = entrances.map(e => ({
            id: e.PermitEntranceID,
            name: e.PermitEntranceName,
          }))

          // Verify the AI's suggested entry point
          if (generatedData.permit_entry_point) {
            const verified = await verifyEntryPoint(
              generatedData.permit_entry_point,
              generatedData.region
            )

            if (verified) {
              // Use the exact name from RIDB
              generatedData.permit_entry_point = verified.PermitEntranceName
              entryPointVerified = true
            } else {
              // AI's suggestion not found - clear it so user can select
              console.log(`Entry point "${generatedData.permit_entry_point}" not found in RIDB`)
              generatedData.permit_entry_point = ''
            }
          }
        }
      } catch (error) {
        console.error('Error verifying entry point with RIDB:', error)
        // Continue without verification
      }
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
