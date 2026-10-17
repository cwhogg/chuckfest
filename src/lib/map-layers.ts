/**
 * Map overlays for site selection. All data stays at its public source; the map
 * reads it live. Sources were checked on 2026-10-17 (see the scoping doc).
 */

export type LayerGroup = 'Fire' | 'Conditions' | 'Boundaries'

export type LayerDef =
  | { id: string; group: LayerGroup; label: string; hint: string; defaultOn: boolean; kind: 'feature'; url: string; where?: string; color: string; popup: (p: Record<string, unknown>) => string; minZoom?: number }
  | { id: string; group: LayerGroup; label: string; hint: string; defaultOn: boolean; kind: 'dynamic'; url: string; layers?: number[]; opacity: number; minZoom?: number }
  | { id: string; group: LayerGroup; label: string; hint: string; defaultOn: boolean; kind: 'smoke' }

const thisYear = new Date().getFullYear()
export const RECENT_BURN_YEARS = 5

const fmtAcres = (v: unknown) => (typeof v === 'number' ? `${Math.round(v).toLocaleString()} acres` : '')

export const BASEMAP = {
  url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}',
  attribution: 'USGS The National Map',
  maxZoom: 16,
}

export const MAP_LAYERS: LayerDef[] = [
  {
    id: 'active-fires',
    group: 'Fire',
    label: 'Active fires',
    hint: 'Current wildfire perimeters (NIFC)',
    defaultOn: true,
    kind: 'feature',
    url: 'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Interagency_Perimeters_Current/FeatureServer/0',
    color: '#d7301f',
    popup: (p) => `<b>${p.poly_IncidentName ?? 'Fire'}</b><br>${fmtAcres(p.poly_GISAcres)}`,
  },
  {
    id: 'recent-burns',
    group: 'Fire',
    label: `Burns since ${thisYear - RECENT_BURN_YEARS}`,
    hint: 'Fire perimeters from recent years (CAL FIRE)',
    defaultOn: true,
    kind: 'feature',
    url: 'https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services/California_Fire_Perimeters_last_5_years_View/FeatureServer/0',
    where: `YEAR_ >= ${thisYear - RECENT_BURN_YEARS}`,
    color: '#b5502b',
    popup: (p) => `<b>${p.FIRE_NAME ?? 'Fire'} (${p.YEAR_ ?? '?'})</b><br>${fmtAcres(p.GIS_ACRES)}`,
  },
  {
    id: 'burn-severity',
    group: 'Fire',
    label: 'Burned areas, 2016 on',
    hint: 'Large-fire burn boundaries by year (MTBS, latest 2024)',
    defaultOn: false,
    kind: 'dynamic',
    url: 'https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_MTBS_01/MapServer',
    layers: [82, 80, 79, 77, 75, 73, 71, 69, 67],
    opacity: 0.6,
  },
  {
    id: 'smoke',
    group: 'Fire',
    label: 'Smoke',
    hint: 'Satellite-detected smoke, latest day (NOAA HMS)',
    defaultOn: false,
    kind: 'smoke',
  },
  {
    id: 'snow',
    group: 'Conditions',
    label: 'Snow depth',
    hint: 'Modeled snow depth, updated daily (NOAA NOHRSC)',
    defaultOn: false,
    kind: 'dynamic',
    url: 'https://mapservices.weather.noaa.gov/raster/rest/services/snow/NOHRSC_Snow_Analysis/MapServer',
    layers: [0],
    opacity: 0.6,
  },
  {
    id: 'wilderness',
    group: 'Boundaries',
    label: 'Wilderness areas',
    hint: 'Designated wilderness boundaries (USFS)',
    defaultOn: true,
    kind: 'dynamic',
    url: 'https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_Wilderness_01/MapServer',
    opacity: 0.45,
  },
  {
    id: 'forests',
    group: 'Boundaries',
    label: 'National forests',
    hint: 'National forest boundaries (USFS)',
    defaultOn: false,
    kind: 'dynamic',
    url: 'https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_ForestSystemBoundaries_01/MapServer',
    opacity: 0.4,
  },
  {
    id: 'parks',
    group: 'Boundaries',
    label: 'National parks',
    hint: 'Park boundaries (NPS)',
    defaultOn: false,
    kind: 'feature',
    url: 'https://services1.arcgis.com/fBc8EJBxQRMcHlei/arcgis/rest/services/NPS_Land_Resources_Division_Boundary_and_Tract_Data_Service/FeatureServer/2',
    color: '#2f5d3a',
    popup: (p) => `<b>${p.UNIT_NAME ?? 'National park'}</b>`,
  },
  {
    id: 'trails',
    group: 'Boundaries',
    label: 'Trails',
    hint: 'National forest trails (USFS); zoom in to see',
    defaultOn: false,
    kind: 'dynamic',
    url: 'https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_TrailNFSPublish_01/MapServer',
    opacity: 0.9,
    minZoom: 11,
  },
  {
    id: 'water',
    group: 'Boundaries',
    label: 'Lakes and streams',
    hint: 'USGS hydrography; zoom in to see',
    defaultOn: false,
    kind: 'dynamic',
    url: 'https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer',
    opacity: 0.8,
    minZoom: 11,
  },
]

export const LAYER_GROUPS: LayerGroup[] = ['Fire', 'Conditions', 'Boundaries']

export const SMOKE_COLORS = { Light: '#b9b9b9', Medium: '#8a8a8a', Heavy: '#555555' } as const
