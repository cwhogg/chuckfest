'use client'

import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface Site {
  id: string
  name: string
  latitude: number | null
  longitude: number | null
  vote_count: number
}

interface SiteWithNumber extends Site {
  number: number
}

interface SitesMapProps {
  sites: SiteWithNumber[]
  selectedSiteId?: string | null
  hoveredSiteId?: string | null
  onSiteSelect?: (siteId: string) => void
}

// Create a numbered marker icon
function createNumberedIcon(number: number, isSelected: boolean, isHovered: boolean): L.DivIcon {
  const size = isSelected ? 36 : isHovered ? 32 : 28
  const fontSize = isSelected ? 14 : isHovered ? 13 : 12
  const bgColor = isSelected ? '#059669' : isHovered ? '#10b981' : '#059669'
  const borderColor = isSelected ? '#047857' : isHovered ? '#059669' : '#047857'
  const shadow = isSelected || isHovered ? '0 4px 6px -1px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.2)'
  const animation = isHovered && !isSelected ? 'animation: pulse 1s ease-in-out infinite;' : ''

  return L.divIcon({
    className: 'custom-numbered-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${bgColor};
        border: 2px solid ${borderColor};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${fontSize}px;
        font-family: system-ui, -apple-system, sans-serif;
        box-shadow: ${shadow};
        transition: all 0.2s ease;
        ${animation}
      ">${number}</div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

// Component to handle map center changes
function MapUpdater({ center, selectedSiteId }: { center: [number, number], selectedSiteId?: string | null }) {
  const map = useMap()

  useEffect(() => {
    if (selectedSiteId) {
      map.flyTo(center, 10, { duration: 0.5 })
    }
  }, [map, center, selectedSiteId])

  return null
}

// Component to fix map size
function MapResizer() {
  const map = useMap()

  useEffect(() => {
    // Force size recalculation
    map.invalidateSize()
    const timer = setTimeout(() => map.invalidateSize(), 250)
    return () => clearTimeout(timer)
  }, [map])

  return null
}

// Component to add global styles
function MapStyles() {
  useEffect(() => {
    const styleId = 'sites-map-styles'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        .custom-numbered-marker {
          background: transparent !important;
          border: none !important;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `
      document.head.appendChild(style)
    }
    return () => {
      const existingStyle = document.getElementById(styleId)
      if (existingStyle) {
        existingStyle.remove()
      }
    }
  }, [])
  return null
}

// Marker component - simplified without React popup to avoid SSR/hydration issues
function SiteMarker({
  site,
  isSelected,
  isHovered,
  onSelect,
}: {
  site: SiteWithNumber
  isSelected: boolean
  isHovered: boolean
  onSelect: () => void
}) {
  const markerRef = useRef<L.Marker>(null)

  // Bind popup manually using Leaflet's native API to avoid React hydration issues
  useEffect(() => {
    if (markerRef.current) {
      const popupContent = `
        <div style="min-width: 160px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span style="display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background-color: #059669; color: white; font-size: 12px; font-weight: bold;">
              ${site.number}
            </span>
            <span style="font-weight: 600; color: #1c1917;">${site.name}</span>
          </div>
          <div style="font-size: 14px; color: #57534e; margin-bottom: 8px;">
            ${site.vote_count} vote${site.vote_count !== 1 ? 's' : ''}
          </div>
          <a href="/sites/${site.id}" style="display: inline-block; font-size: 14px; color: #047857; font-weight: 500; text-decoration: none;">
            View Details →
          </a>
        </div>
      `
      markerRef.current.bindPopup(popupContent)
    }
  }, [site])

  // Open popup when selected via list click
  useEffect(() => {
    if (isSelected && markerRef.current) {
      markerRef.current.openPopup()
    }
  }, [isSelected])

  const icon = createNumberedIcon(site.number, isSelected, isHovered)

  return (
    <Marker
      ref={markerRef}
      position={[site.latitude!, site.longitude!]}
      icon={icon}
      eventHandlers={{
        click: onSelect
      }}
    />
  )
}

export function SitesMap({ sites, selectedSiteId, hoveredSiteId, onSiteSelect }: SitesMapProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#f5f5f4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#78716c' }}>Loading map...</div>
      </div>
    )
  }

  // Filter sites with valid coordinates
  const sitesWithCoords = sites.filter(
    site => site.latitude !== null && site.longitude !== null
  )

  // Sierra Nevada center (roughly Yosemite area)
  const defaultCenter: [number, number] = [37.8651, -119.5383]

  // If a site is selected and has coords, center on it
  const selectedSite = selectedSiteId
    ? sitesWithCoords.find(s => s.id === selectedSiteId)
    : null

  const center: [number, number] = selectedSite
    ? [selectedSite.latitude!, selectedSite.longitude!]
    : defaultCenter

  return (
    <MapContainer
      center={center}
      zoom={7}
      style={{ width: '100%', height: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapStyles />
      <MapResizer />
      <MapUpdater center={center} selectedSiteId={selectedSiteId} />
      {sitesWithCoords.map(site => (
        <SiteMarker
          key={site.id}
          site={site}
          isSelected={site.id === selectedSiteId}
          isHovered={site.id === hoveredSiteId}
          onSelect={() => onSiteSelect?.(site.id)}
        />
      ))}
    </MapContainer>
  )
}
