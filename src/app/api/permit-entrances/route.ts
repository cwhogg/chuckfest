import { NextRequest, NextResponse } from 'next/server'
import { getPermitEntrances, getFacilityIdFromRegion, WILDERNESS_FACILITIES } from '@/lib/ridb'

/**
 * GET /api/permit-entrances
 *
 * Fetch permit entry points from RIDB
 * Query params:
 *   - facilityId: specific facility ID (e.g., "233262")
 *   - region: wilderness region name (e.g., "John Muir Wilderness")
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const facilityId = searchParams.get('facilityId')
    const region = searchParams.get('region')

    if (!process.env.RIDB_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'RIDB API key not configured' },
        { status: 500 }
      )
    }

    let targetFacilityId: string | null = facilityId

    // If region provided instead of facilityId, look it up
    if (!targetFacilityId && region) {
      targetFacilityId = getFacilityIdFromRegion(region)
    }

    if (!targetFacilityId) {
      // Return list of known facilities
      return NextResponse.json({
        success: true,
        entrances: [],
        facilities: Object.entries(WILDERNESS_FACILITIES).map(([key, val]) => ({
          key,
          ...val,
        })),
        message: 'No facility specified. Provide facilityId or region parameter.',
      })
    }

    const entrances = await getPermitEntrances(targetFacilityId)

    return NextResponse.json({
      success: true,
      facilityId: targetFacilityId,
      entrances: entrances.map(e => ({
        id: e.PermitEntranceID,
        name: e.PermitEntranceName,
        description: e.PermitEntranceDescription,
        district: e.District,
        latitude: e.Latitude,
        longitude: e.Longitude,
      })),
      count: entrances.length,
    })
  } catch (error) {
    console.error('Error in GET /api/permit-entrances:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
