'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import * as esri from 'esri-leaflet'
import 'leaflet/dist/leaflet.css'
import { Layers, X } from 'lucide-react'
import { BASEMAP, LAYER_GROUPS, MAP_LAYERS, SMOKE_COLORS, type LayerDef } from '@/lib/map-layers'
import { cn } from './ui'

export type MapSite = {
  id: string
  name: string
  latitude: number
  longitude: number
  totalScore: number | null
  votes: number
  highlight?: 'chosen' | 'backup' | 'mine'
}

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

function pinColor(site: MapSite) {
  if (site.highlight === 'chosen') return '#c9a227'
  const s = site.totalScore ?? 0
  return s >= 75 ? '#2f5d3a' : s >= 68 ? '#3b6e8f' : '#7a7067'
}

function makeOverlay(def: LayerDef): L.Layer {
  if (def.kind === 'feature') {
    return esri.featureLayer({
      url: def.url,
      where: def.where,
      simplifyFactor: 0.5,
      precision: 5,
      style: () => ({ color: def.color, weight: 1.5, fillColor: def.color, fillOpacity: 0.22 }),
      onEachFeature: (feature, layer) => {
        const props = Object.fromEntries(Object.entries(feature.properties ?? {}).map(([k, v]) => [k, typeof v === 'string' ? esc(v) : v]))
        layer.bindPopup(def.popup(props))
      },
    } as esri.FeatureLayerOptions)
  }
  if (def.kind === 'dynamic') {
    return esri.dynamicMapLayer({ url: def.url, layers: def.layers, opacity: def.opacity, minZoom: def.minZoom } as esri.DynamicMapLayerOptions)
  }
  // Smoke: our own GeoJSON route
  const group = L.geoJSON(undefined, {
    style: (f) => {
      const color = SMOKE_COLORS[(f?.properties?.density as keyof typeof SMOKE_COLORS) ?? 'Light']
      return { color, weight: 0.5, fillColor: color, fillOpacity: 0.35 }
    },
    onEachFeature: (f, layer) => layer.bindPopup(`Smoke: ${esc(f.properties?.density)}`),
  })
  fetch('/api/layers/smoke')
    .then((r) => r.json())
    .then((data) => group.addData(data))
    .catch(() => {})
  return group
}

export function SiteMap({
  sites,
  className,
  initialLayers,
  focus,
  showLayerButton = true,
}: {
  sites: MapSite[]
  className?: string
  initialLayers?: string[]
  focus?: { latitude: number; longitude: number; zoom?: number }
  showLayerButton?: boolean
}) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const markers = useRef<L.LayerGroup | null>(null)
  const overlays = useRef(new Map<string, L.Layer>())
  const [active, setActive] = useState<string[]>(() => initialLayers ?? MAP_LAYERS.filter((l) => l.defaultOn).map((l) => l.id))
  const [panelOpen, setPanelOpen] = useState(false)

  // Create the map once.
  useEffect(() => {
    if (!el.current || map.current) return
    const m = L.map(el.current, { zoomControl: true, attributionControl: true }).setView([37.6, -119.2], 7)
    L.tileLayer(BASEMAP.url, { attribution: BASEMAP.attribution, maxZoom: BASEMAP.maxZoom }).addTo(m)
    markers.current = L.layerGroup().addTo(m)
    map.current = m
    const ro = new ResizeObserver(() => m.invalidateSize())
    ro.observe(el.current)
    const layers = overlays.current
    return () => {
      ro.disconnect()
      m.remove()
      map.current = null
      layers.clear()
    }
  }, [])

  // Site pins.
  useEffect(() => {
    const m = map.current
    const group = markers.current
    if (!m || !group) return
    group.clearLayers()
    for (const s of sites) {
      const radius = 7 + Math.min(s.votes, 6) * 1.5
      L.circleMarker([s.latitude, s.longitude], {
        radius,
        color: s.highlight === 'backup' ? '#c9a227' : '#fffdf9',
        weight: s.highlight ? 3 : 2,
        fillColor: pinColor(s),
        fillOpacity: 0.95,
      })
        .bindPopup(
          `<div style="font-family:inherit;min-width:160px"><b style="font-size:14px">${esc(s.name)}</b><br>` +
            `${s.totalScore != null ? `Score ${s.totalScore}/100 · ` : ''}${s.votes} vote${s.votes === 1 ? '' : 's'}<br>` +
            `<a href="/sites/${s.id}" style="color:#3b6e8f;font-weight:600">View site</a></div>`,
        )
        .addTo(group)
    }
    if (focus) m.setView([focus.latitude, focus.longitude], focus.zoom ?? 11)
    else if (sites.length > 1) m.fitBounds(L.latLngBounds(sites.map((s) => [s.latitude, s.longitude])), { padding: [30, 30], maxZoom: 9 })
  }, [sites, focus])

  // Overlays follow the toggles.
  useEffect(() => {
    const m = map.current
    if (!m) return
    for (const def of MAP_LAYERS) {
      const on = active.includes(def.id)
      let layer = overlays.current.get(def.id)
      if (on && !layer) {
        layer = makeOverlay(def)
        overlays.current.set(def.id, layer)
      }
      if (!layer) continue
      if (on && !m.hasLayer(layer)) layer.addTo(m)
      if (!on && m.hasLayer(layer)) m.removeLayer(layer)
    }
  }, [active])

  const toggle = (id: string) => setActive((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  return (
    <div className={cn('relative isolate overflow-hidden rounded-xl border border-line', className)}>
      <div ref={el} className="h-full w-full" />
      {showLayerButton && (
        <button
          type="button"
          onClick={() => setPanelOpen((o) => !o)}
          className="absolute right-3 top-3 z-[500] inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold text-ink shadow-sm"
          aria-expanded={panelOpen}
        >
          <Layers size={16} /> Layers{active.length ? ` (${active.length})` : ''}
        </button>
      )}
      {panelOpen && (
        <div className="absolute inset-x-3 top-14 z-[500] max-h-[70%] overflow-y-auto rounded-xl border border-line bg-card p-3 shadow-lg sm:left-auto sm:w-72">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-sm font-semibold">Map layers</p>
            <button type="button" onClick={() => setPanelOpen(false)} aria-label="Close layers" className="text-muted">
              <X size={18} />
            </button>
          </div>
          {LAYER_GROUPS.map((group) => (
            <fieldset key={group} className="mt-2">
              <legend className="text-xs font-semibold uppercase tracking-wide text-muted">{group}</legend>
              {MAP_LAYERS.filter((l) => l.group === group).map((l) => (
                <label key={l.id} className="flex cursor-pointer items-start gap-2 py-1.5">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-pine" checked={active.includes(l.id)} onChange={() => toggle(l.id)} />
                  <span>
                    <span className="block text-sm font-semibold text-ink">{l.label}</span>
                    <span className="block text-xs text-muted">{l.hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          ))}
          <p className="mt-2 border-t border-line pt-2 text-xs text-muted">
            Pins: <span className="font-semibold text-pine">green</span> scores 75+, <span className="font-semibold text-lake">blue</span> 68–74,{' '}
            <span className="font-semibold text-gold">gold</span> chosen site. Bigger pins have more votes.
          </p>
        </div>
      )}
    </div>
  )
}
