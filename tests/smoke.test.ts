import { expect, it } from 'vitest'
import { hmsKmlUrl, parseHmsKml } from '@/lib/smoke'

const placemark = (density: string, coords: string) =>
  `<Placemark><description><![CDATA[<div>Density: ${density}<br></div>]]></description><Polygon><outerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`

it('keeps California plumes with their density', () => {
  const kml = `<kml><Document>${placemark('Heavy', '-119,37,0 -118,37,0 -118,38,0 -119,37,0')}${placemark(
    'Light',
    '-82.2,29.1,0 -82.3,29.1,0 -82.3,29.0,0 -82.2,29.1,0',
  )}${placemark('Medium', 'garbage')}</Document></kml>`
  const fc = parseHmsKml(kml)
  expect(fc.features).toHaveLength(1)
  expect(fc.features[0].properties.density).toBe('Heavy')
  expect(fc.features[0].geometry.coordinates[0][0]).toEqual([-119, 37])
})

it('builds the daily file URL', () => {
  expect(hmsKmlUrl(new Date('2026-10-16T20:00:00Z'))).toBe(
    'https://satepsanone.nesdis.noaa.gov/pub/FIRE/web/HMS/Smoke_Polygons/KML/2026/10/hms_smoke20261016.kml',
  )
})
