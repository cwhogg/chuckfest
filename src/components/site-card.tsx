'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Curated Unsplash photo IDs for mountain/lake scenes
const PLACEHOLDER_PHOTOS = [
  'photo-1464822759023-fed622ff2c3b', // Mountain peak
  'photo-1506905925346-21bda4d32df4', // Mountain range
  'photo-1519681393784-d120267933ba', // Snowy mountains
  'photo-1454496522488-7a8e488e8606', // Mountain lake
  'photo-1501785888041-af3ef285b470', // Lake reflection
  'photo-1470071459604-3b5ec3a7fe05', // Forest valley
  'photo-1433086966358-54859d0ed716', // Waterfall
  'photo-1507003211169-0a1dd7228f2d', // Alpine meadow
  'photo-1464278533981-50106e6176b1', // Misty mountains
  'photo-1486870591958-9b9d0d1dda99', // Sierra peaks
]

interface SiteCardProps {
  site: {
    id: string
    name: string
    region: string | null
    description: string | null
    distance_miles: number | null
    elevation_gain_ft: number | null
    peak_elevation_ft: number | null
    difficulty: string | null
    permit_required: boolean
    vote_count: number
    photos?: string[] | null
  }
  number: number
  isVoted: boolean
  canVote: boolean
  onVote: () => void
  onUnvote: () => void
  isSelected?: boolean
  isHovered?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  setRef?: (el: HTMLDivElement | null) => void
}

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-700 border-green-200',
  moderate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  strenuous: 'bg-red-100 text-red-700 border-red-200',
}

// Get a consistent placeholder photo based on site ID
function getPlaceholderPhoto(siteId: string): string {
  let hash = 0
  for (let i = 0; i < siteId.length; i++) {
    const char = siteId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  const index = Math.abs(hash) % PLACEHOLDER_PHOTOS.length
  return `https://images.unsplash.com/${PLACEHOLDER_PHOTOS[index]}?w=800&h=400&fit=crop&auto=format`
}

export function SiteCard({
  site,
  number,
  isVoted,
  canVote,
  onVote,
  onUnvote,
  isSelected,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  setRef,
}: SiteCardProps) {
  const handleVoteClick = () => {
    if (isVoted) {
      onUnvote()
    } else {
      onVote()
    }
  }

  const truncatedDescription = site.description
    ? site.description.length > 100
      ? site.description.substring(0, 100) + '...'
      : site.description
    : null

  // Use first photo from array, or fall back to placeholder
  const photoUrl = site.photos && site.photos.length > 0
    ? site.photos[0]
    : getPlaceholderPhoto(site.id)

  return (
    <Card
      ref={setRef}
      className={cn(
        'overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md',
        isSelected && 'ring-2 ring-emerald-500 bg-emerald-50/50',
        isHovered && !isSelected && 'ring-2 ring-emerald-300 bg-emerald-50/30',
        isVoted && 'border-l-4 border-l-emerald-500',
        !isSelected && !isHovered && 'hover:bg-stone-50/50'
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Photo with number badge */}
      <div className="relative h-[180px] w-full">
        <Image
          src={photoUrl}
          alt={site.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        {/* Number badge */}
        <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-lg">
          {number}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Site name and region */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-stone-900 leading-tight">
              {site.name}
            </h3>
            {site.region && (
              <Badge
                variant="secondary"
                className="mt-1.5 text-xs font-normal bg-stone-100 text-stone-600"
              >
                {site.region}
              </Badge>
            )}
          </div>
          {/* Vote count */}
          <div className="text-right flex-shrink-0">
            <span className="text-lg font-bold text-emerald-700">
              {site.vote_count}
            </span>
            <span className="text-xs text-stone-500 block">
              vote{site.vote_count !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-stone-600">
          {site.distance_miles !== null && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              {site.distance_miles} mi
            </span>
          )}
          {site.elevation_gain_ft !== null && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              {site.elevation_gain_ft.toLocaleString()} ft
            </span>
          )}
          {site.peak_elevation_ft !== null && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21l6-6 4 4 8-8" />
              </svg>
              {site.peak_elevation_ft.toLocaleString()} ft peak
            </span>
          )}
          {site.difficulty && (
            <Badge
              variant="outline"
              className={cn(
                'text-xs capitalize',
                difficultyColors[site.difficulty.toLowerCase()] || 'bg-stone-100 text-stone-600'
              )}
            >
              {site.difficulty}
            </Badge>
          )}
          {site.permit_required && (
            <Badge variant="outline" className="text-xs text-amber-700 border-amber-300 bg-amber-50">
              Permit
            </Badge>
          )}
        </div>

        {/* Description */}
        {truncatedDescription && (
          <p className="mt-3 text-sm text-stone-500 line-clamp-2">
            {truncatedDescription}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-stone-100">
          <Link href={`/sites/${site.id}`}>
            <Button
              variant="outline"
              size="sm"
              className="text-stone-600 border-stone-300 hover:bg-stone-50"
            >
              View Details
            </Button>
          </Link>
          <Button
            variant={isVoted ? 'default' : 'outline'}
            size="sm"
            onClick={handleVoteClick}
            disabled={!isVoted && !canVote}
            className={cn(
              'transition-all duration-150 active:scale-95',
              isVoted
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400'
            )}
          >
            {isVoted ? (
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                Voted
              </span>
            ) : (
              'Vote'
            )}
          </Button>
        </div>
      </div>
    </Card>
  )
}
