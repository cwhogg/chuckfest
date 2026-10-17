export type SmokeDensity = 'Light' | 'Medium' | 'Heavy'

type Feature = {
  type: 'Feature'
  properties: { density: SmokeDensity }
  geometry: { type: 'Polygon'; coordinates: [number, number][][] }
}

/** Rough California bounding box: [west, south, east, north]. */
export const CA_BBOX = [-125, 32, -114, 42.5] as const

/**
 * Convert a NOAA HMS daily smoke KML file into GeoJSON polygons with a density,
 * keeping only plumes that overlap `bbox`.
 */
export function parseHmsKml(kml: string, bbox: readonly number[] = CA_BBOX) {
  const [w, s, e, n] = bbox
  const features: Feature[] = []
  for (const placemark of kml.split('<Placemark').slice(1)) {
    const density = /Density:\s*(Light|Medium|Heavy)/.exec(placemark)?.[1] as SmokeDensity | undefined
    const coords = /<coordinates>([\s\S]*?)<\/coordinates>/.exec(placemark)?.[1]
    if (!density || !coords) continue
    const ring = coords
      .trim()
      .split(/\s+/)
      .map((p) => p.split(',').map(Number))
      .filter((p) => p.length >= 2 && p.every((x) => Number.isFinite(x)))
      .map(([lon, lat]) => [lon, lat] as [number, number])
    if (ring.length < 4) continue
    const lons = ring.map((p) => p[0])
    const lats = ring.map((p) => p[1])
    const overlaps = Math.max(...lons) >= w && Math.min(...lons) <= e && Math.max(...lats) >= s && Math.min(...lats) <= n
    if (!overlaps) continue
    features.push({ type: 'Feature', properties: { density }, geometry: { type: 'Polygon', coordinates: [ring] } })
  }
  return { type: 'FeatureCollection' as const, features }
}

/** URL of the HMS smoke KML for a UTC date. */
export function hmsKmlUrl(date: Date) {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `https://satepsanone.nesdis.noaa.gov/pub/FIRE/web/HMS/Smoke_Polygons/KML/${y}/${m}/hms_smoke${y}${m}${d}.kml`
}
