'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface TripLocationMapProps {
  latitude: number
  longitude: number
  className?: string
}

// Create a simple pin marker icon
function createPinIcon(): L.DivIcon {
  return L.divIcon({
    className: 'trip-location-pin',
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background-color: #2d5016;
        border: 2px solid #1e3a10;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">
        <div style="
          width: 8px;
          height: 8px;
          background-color: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

// Component to add global styles for the marker
function MapStyles() {
  useEffect(() => {
    const styleId = 'trip-location-map-styles'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        .trip-location-pin {
          background: transparent !important;
          border: none !important;
        }
        .trip-location-map .leaflet-control-zoom,
        .trip-location-map .leaflet-control-attribution {
          display: none !important;
        }
      `
      document.head.appendChild(style)
    }
  }, [])
  return null
}

export function TripLocationMap({ latitude, longitude, className = '' }: TripLocationMapProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div className={`bg-stone-100 flex items-center justify-center ${className}`}>
        <div className="text-stone-400 text-xs">...</div>
      </div>
    )
  }

  const position: [number, number] = [latitude, longitude]
  const pinIcon = createPinIcon()

  return (
    <div className={`trip-location-map ${className}`}>
      <MapContainer
        center={position}
        zoom={10}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        attributionControl={false}
        doubleClickZoom={false}
        touchZoom={false}
        keyboard={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapStyles />
        <Marker position={position} icon={pinIcon} />
      </MapContainer>
    </div>
  )
}
