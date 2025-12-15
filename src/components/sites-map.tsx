'use client'

import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import Link from 'next/link'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in Next.js
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const selectedIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -40],
  shadowSize: [49, 49],
  className: 'selected-marker'
})

const hoveredIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [28, 45],
  iconAnchor: [14, 45],
  popupAnchor: [1, -37],
  shadowSize: [45, 45],
  className: 'hovered-marker'
})

L.Marker.prototype.options.icon = defaultIcon

interface Site {
  id: string
  name: string
  latitude: number | null
  longitude: number | null
  vote_count: number
}

interface SitesMapProps {
  sites: Site[]
  selectedSiteId?: string | null
  hoveredSiteId?: string | null
  onSiteSelect?: (siteId: string) => void
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

// Component to add pulsing animation styles
function MapStyles() {
  useEffect(() => {
    const styleId = 'sites-map-styles'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        .hovered-marker {
          animation: pulse 1s ease-in-out infinite;
        }
        .selected-marker {
          filter: hue-rotate(120deg) brightness(1.2);
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.9; }
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

// Marker component with ref handling
function SiteMarker({
  site,
  isSelected,
  isHovered,
  onSelect,
}: {
  site: Site
  isSelected: boolean
  isHovered: boolean
  onSelect: () => void
}) {
  const markerRef = useRef<L.Marker>(null)

  // Open popup when selected via list click
  useEffect(() => {
    if (isSelected && markerRef.current) {
      markerRef.current.openPopup()
    }
  }, [isSelected])

  const getIcon = () => {
    if (isSelected) return selectedIcon
    if (isHovered) return hoveredIcon
    return defaultIcon
  }

  return (
    <Marker
      ref={markerRef}
      position={[site.latitude!, site.longitude!]}
      icon={getIcon()}
      eventHandlers={{
        click: onSelect
      }}
    >
      <Popup>
        <div className="min-w-[150px]">
          <div className="font-semibold text-stone-900">{site.name}</div>
          <div className="text-sm text-stone-600 mt-1">
            {site.vote_count} vote{site.vote_count !== 1 ? 's' : ''}
          </div>
          <Link
            href={`/sites/${site.id}`}
            className="inline-block mt-2 text-sm text-emerald-700 hover:text-emerald-800 hover:underline font-medium"
          >
            View Details &rarr;
          </Link>
        </div>
      </Popup>
    </Marker>
  )
}

export function SitesMap({ sites, selectedSiteId, hoveredSiteId, onSiteSelect }: SitesMapProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div className="w-full h-full bg-stone-100 flex items-center justify-center">
        <div className="text-stone-500">Loading map...</div>
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
      className="w-full h-full"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapStyles />
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
