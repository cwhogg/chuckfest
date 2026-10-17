import 'server-only'

export type Hazard = { kind: 'active' | 'burn'; name: string; year: number | null; acres: number | null }

const SOURCES = [
  {
    kind: 'active' as const,
    url: 'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Interagency_Perimeters_Current/FeatureServer/0/query',
    fields: 'poly_IncidentName,poly_GISAcres',
    map: (a: Record<string, unknown>) => ({ name: String(a.poly_IncidentName ?? 'Unnamed fire'), year: new Date().getFullYear(), acres: (a.poly_GISAcres as number) ?? null }),
  },
  {
    kind: 'burn' as const,
    url: 'https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services/California_Fire_Perimeters_last_5_years_View/FeatureServer/0/query',
    fields: 'FIRE_NAME,YEAR_,GIS_ACRES',
    map: (a: Record<string, unknown>) => ({ name: String(a.FIRE_NAME ?? 'Unnamed fire'), year: (a.YEAR_ as number) ?? null, acres: (a.GIS_ACRES as number) ?? null }),
  },
]

/**
 * Fires burning now, or burned in the last 5 years, within `miles` of a point.
 * Cached for 6 hours; returns [] if a source is unreachable rather than failing the page.
 */
export async function nearbyFireHazards(lat: number, lng: number, miles = 3): Promise<Hazard[]> {
  const results = await Promise.all(
    SOURCES.map(async (src) => {
      const params = new URLSearchParams({
        geometry: `${lng},${lat}`,
        geometryType: 'esriGeometryPoint',
        inSR: '4326',
        spatialRel: 'esriSpatialRelIntersects',
        distance: String(miles),
        units: 'esriSRUnit_StatuteMile',
        outFields: src.fields,
        returnGeometry: 'false',
        f: 'json',
      })
      try {
        const res = await fetch(`${src.url}?${params}`, { next: { revalidate: 6 * 3600 }, signal: AbortSignal.timeout(8000) })
        if (!res.ok) return []
        const data = (await res.json()) as { features?: { attributes: Record<string, unknown> }[] }
        return (data.features ?? []).map((f) => ({ kind: src.kind, ...src.map(f.attributes) }))
      } catch {
        return []
      }
    }),
  )
  const seen = new Set<string>()
  return results
    .flat()
    .filter((h) => {
      const key = `${h.name.toLowerCase()}|${h.year}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => (a.kind === b.kind ? (b.year ?? 0) - (a.year ?? 0) : a.kind === 'active' ? -1 : 1))
}
