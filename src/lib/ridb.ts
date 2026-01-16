/**
 * RIDB (Recreation Information Database) API client
 * https://ridb.recreation.gov/docs
 *
 * Used to fetch and verify permit entry points from recreation.gov
 */

const RIDB_BASE_URL = 'https://ridb.recreation.gov/api/v1'

// Known facility IDs for wilderness permit systems
export const WILDERNESS_FACILITIES: Record<string, { facilityId: string; name: string }> = {
  'inyo': { facilityId: '233262', name: 'Inyo National Forest Wilderness Permits' },
  'john_muir': { facilityId: '233262', name: 'John Muir Wilderness' },
  'ansel_adams': { facilityId: '233262', name: 'Ansel Adams Wilderness' },
  'yosemite': { facilityId: '445859', name: 'Yosemite National Park Wilderness Permits' },
  'desolation': { facilityId: '233261', name: 'Desolation Wilderness' },
  'sequoia_kings': { facilityId: '445857', name: 'Sequoia and Kings Canyon Wilderness Permits' },
}

export interface PermitEntrance {
  PermitEntranceID: string
  PermitEntranceName: string
  PermitEntranceDescription?: string
  District?: string
  Town?: string
  PermitEntranceAccessible?: boolean
  Latitude?: number
  Longitude?: number
  CreatedDate?: string
  LastUpdatedDate?: string
}

export interface RIDBResponse<T> {
  RECDATA: T[]
  METADATA: {
    RESULTS: {
      CURRENT_COUNT: number
      TOTAL_COUNT: number
    }
  }
}

/**
 * Get the RIDB API key from environment
 */
function getApiKey(): string | null {
  return process.env.RIDB_API_KEY || null
}

/**
 * Fetch all permit entrances for a given facility
 */
export async function getPermitEntrances(facilityId: string): Promise<PermitEntrance[]> {
  const apiKey = getApiKey()

  if (!apiKey) {
    console.warn('RIDB_API_KEY not set - cannot fetch permit entrances')
    return []
  }

  try {
    const url = `${RIDB_BASE_URL}/facilities/${facilityId}/permitentrances?limit=100`
    const response = await fetch(url, {
      headers: {
        'apikey': apiKey,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      console.error(`RIDB API error: ${response.status} ${response.statusText}`)
      return []
    }

    const data: RIDBResponse<PermitEntrance> = await response.json()
    return data.RECDATA || []
  } catch (error) {
    console.error('Error fetching permit entrances:', error)
    return []
  }
}

/**
 * Get permit entrances for a wilderness area by name
 */
export async function getEntrancesForWilderness(wildernessName: string): Promise<PermitEntrance[]> {
  // Normalize the name to find matching facility
  const normalized = wildernessName.toLowerCase()

  let facilityId: string | null = null

  // Try to match wilderness name to facility
  if (normalized.includes('john muir') || normalized.includes('inyo')) {
    facilityId = WILDERNESS_FACILITIES.inyo.facilityId
  } else if (normalized.includes('ansel adams')) {
    facilityId = WILDERNESS_FACILITIES.inyo.facilityId // Same permit system as John Muir
  } else if (normalized.includes('yosemite')) {
    facilityId = WILDERNESS_FACILITIES.yosemite.facilityId
  } else if (normalized.includes('desolation')) {
    facilityId = WILDERNESS_FACILITIES.desolation.facilityId
  } else if (normalized.includes('sequoia') || normalized.includes('kings canyon')) {
    facilityId = WILDERNESS_FACILITIES.sequoia_kings.facilityId
  }

  if (!facilityId) {
    console.warn(`Unknown wilderness area: ${wildernessName}`)
    return []
  }

  return getPermitEntrances(facilityId)
}

/**
 * Verify if an entry point name exists in the permit system
 * Returns the matching entrance if found, null otherwise
 */
export async function verifyEntryPoint(
  entryPointName: string,
  wildernessName: string
): Promise<PermitEntrance | null> {
  const entrances = await getEntrancesForWilderness(wildernessName)

  if (entrances.length === 0) {
    return null
  }

  // Normalize for comparison
  const normalizedInput = entryPointName.toLowerCase().trim()

  // Try exact match first
  let match = entrances.find(
    e => e.PermitEntranceName.toLowerCase() === normalizedInput
  )

  // Try partial match if no exact match
  if (!match) {
    match = entrances.find(
      e => e.PermitEntranceName.toLowerCase().includes(normalizedInput) ||
           normalizedInput.includes(e.PermitEntranceName.toLowerCase())
    )
  }

  return match || null
}

/**
 * Get facility ID from wilderness/region name
 */
export function getFacilityIdFromRegion(region: string): string | null {
  const normalized = region.toLowerCase()

  if (normalized.includes('john muir') || normalized.includes('inyo') || normalized.includes('ansel adams')) {
    return WILDERNESS_FACILITIES.inyo.facilityId
  } else if (normalized.includes('yosemite')) {
    return WILDERNESS_FACILITIES.yosemite.facilityId
  } else if (normalized.includes('desolation')) {
    return WILDERNESS_FACILITIES.desolation.facilityId
  } else if (normalized.includes('sequoia') || normalized.includes('kings canyon')) {
    return WILDERNESS_FACILITIES.sequoia_kings.facilityId
  }

  return null
}
