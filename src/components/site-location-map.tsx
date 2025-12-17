'use client'

import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface SiteLocationMapProps {
  latitude: number
  longitude: number
  name: string
}

// Create a simple marker icon
function createIcon(): L.DivIcon {
  return L.divIcon({
    className: 'custom-site-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background-color: #059669;
        border: 3px solid #047857;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  })
}

// Component to fix map size
function MapResizer() {
  const map = useMap()

  useEffect(() => {
    map.invalidateSize()
    const timer = setTimeout(() => map.invalidateSize(), 250)
    return () => clearTimeout(timer)
  }, [map])

  return null
}

// Add global styles
function MapStyles() {
  useEffect(() => {
    const styleId = 'site-location-map-styles'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        .custom-site-marker {
          background: transparent !important;
          border: none !important;
        }
      `
      document.head.appendChild(style)
    }
  }, [])
  return null
}

function SiteMarker({ latitude, longitude, name }: { latitude: number; longitude: number; name: string }) {
  const icon = createIcon()

  const bindPopup = useCallback((marker: L.Marker | null) => {
    if (marker) {
      marker.bindPopup(`
        <div style="font-family: system-ui, -apple-system, sans-serif; padding: 4px;">
          <strong style="color: #1c1917;">${name}</strong>
          <div style="font-size: 12px; color: #57534e; margin-top: 4px;">
            ${latitude.toFixed(4)}, ${longitude.toFixed(4)}
          </div>
        </div>
      `)
    }
  }, [name, latitude, longitude])

  return (
    <Marker
      ref={bindPopup}
      position={[latitude, longitude]}
      icon={icon}
    />
  )
}

export function SiteLocationMap({ latitude, longitude, name }: SiteLocationMapProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#f5f5f4', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>
        <div style={{ color: '#78716c' }}>Loading map...</div>
      </div>
    )
  }

  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={12}
      style={{ width: '100%', height: '100%', borderRadius: '12px' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapStyles />
      <MapResizer />
      <SiteMarker latitude={latitude} longitude={longitude} name={name} />
    </MapContainer>
  )
}
