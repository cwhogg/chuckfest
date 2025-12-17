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

interface FullScreenMapProps {
  latitude: number
  longitude: number
  locationName: string
  onClose: () => void
}

export function FullScreenMap({ latitude, longitude, locationName, onClose }: FullScreenMapProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  if (!isClient) {
    return null
  }

  const position: [number, number] = [latitude, longitude]
  const pinIcon = createPinIcon()

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col" onClick={onClose}>
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between" onClick={e => e.stopPropagation()}>
        <h2 className="font-semibold text-stone-800">{locationName}</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-stone-100 rounded-full transition-colors"
        >
          <svg className="w-6 h-6 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Map */}
      <div className="flex-1" onClick={e => e.stopPropagation()}>
        <MapContainer
          center={position}
          zoom={11}
          style={{ width: '100%', height: '100%' }}
          scrollWheelZoom={true}
          dragging={true}
          zoomControl={true}
          attributionControl={false}
          doubleClickZoom={true}
          touchZoom={true}
          keyboard={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapStyles />
          <Marker position={position} icon={pinIcon} />
        </MapContainer>
      </div>
    </div>
  )
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
        zoom={6}
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
