import { NextResponse } from 'next/server'
import { hmsKmlUrl, parseHmsKml } from '@/lib/smoke'

/** Latest NOAA HMS smoke plumes over California as GeoJSON (today's file, else yesterday's). */
export async function GET() {
  const now = new Date()
  for (const daysAgo of [0, 1, 2]) {
    const day = new Date(now.getTime() - daysAgo * 86_400_000)
    const res = await fetch(hmsKmlUrl(day), { next: { revalidate: 3600 } })
    if (!res.ok) continue
    const data = parseHmsKml(await res.text())
    return NextResponse.json(
      { date: day.toISOString().slice(0, 10), ...data },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } },
    )
  }
  return NextResponse.json({ date: null, type: 'FeatureCollection', features: [] })
}
