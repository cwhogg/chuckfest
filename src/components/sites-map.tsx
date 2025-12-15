'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
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

export function SitesMap({ sites, selectedSiteId, onSiteSelect }: SitesMapProps) {
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
      <MapUpdater center={center} selectedSiteId={selectedSiteId} />
      {sitesWithCoords.map(site => (
        <Marker
          key={site.id}
          position={[site.latitude!, site.longitude!]}
          icon={site.id === selectedSiteId ? selectedIcon : defaultIcon}
          eventHandlers={{
            click: () => onSiteSelect?.(site.id)
          }}
        >
          <Popup>
            <div className="font-medium">{site.name}</div>
            <div className="text-sm text-stone-600">
              {site.vote_count} vote{site.vote_count !== 1 ? 's' : ''}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
