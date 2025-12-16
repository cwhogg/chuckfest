'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

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
    permit_url: string | null
    trail_info_url: string | null
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

function getPlaceholderImage(siteId: string): string {
  return `https://picsum.photos/seed/${siteId}/200/200`
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
  const [imageError, setImageError] = useState(false)

  const handleVoteClick = () => {
    if (isVoted) {
      onUnvote()
    } else {
      onVote()
    }
  }

  const photoUrl = site.photos && site.photos.length > 0 && !imageError
    ? site.photos[0]
    : getPlaceholderImage(site.id)

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
      <div className="flex">
        {/* Left section - Content + Links at bottom */}
        <div className="flex-1 p-3 flex flex-col min-w-0">
          {/* Header: number + name */}
          <div className="flex items-start gap-2">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
              {number}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-base text-stone-900 leading-tight">
                {site.name}
              </h3>
              {site.region && (
                <span className="text-xs text-stone-500 mt-0.5 block">
                  {site.region}
                </span>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-stone-600">
            {site.distance_miles !== null && (
              <span className="flex items-center gap-0.5">
                <svg className="w-3 h-3 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                {site.distance_miles}mi
              </span>
            )}
            {site.elevation_gain_ft !== null && (
              <span className="flex items-center gap-0.5">
                <svg className="w-3 h-3 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                {site.elevation_gain_ft.toLocaleString()}ft
              </span>
            )}
            {site.peak_elevation_ft !== null && (
              <span className="flex items-center gap-0.5">
                <svg className="w-3 h-3 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21l6-6 4 4 8-8" />
                </svg>
                {site.peak_elevation_ft.toLocaleString()}ft
              </span>
            )}
            {site.difficulty && (
              <Badge
                variant="outline"
                className={cn(
                  'text-xs capitalize h-5 px-1.5',
                  difficultyColors[site.difficulty.toLowerCase()] || 'bg-stone-100 text-stone-600'
                )}
              >
                {site.difficulty}
              </Badge>
            )}
          </div>

          {/* Description */}
          {site.description && (
            <p className="mt-2 text-xs text-stone-500 line-clamp-2 leading-relaxed flex-1">
              {site.description}
            </p>
          )}

          {/* Links row at bottom */}
          <div className="flex items-center gap-1 mt-3 pt-2 border-t border-stone-100">
            <Link href={`/sites/${site.id}`}>
              <Button
                variant="ghost"
                size="sm"
                className="text-stone-600 hover:text-stone-900 h-6 px-2 text-xs"
              >
                View Details
              </Button>
            </Link>
            {site.trail_info_url && (
              <>
                <span className="text-stone-300">·</span>
                <a
                  href={site.trail_info_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-green-700 hover:text-green-900 hover:bg-green-50 h-6 px-2 text-xs"
                  >
                    AllTrails
                    <svg className="w-2.5 h-2.5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </Button>
                </a>
              </>
            )}
            {site.permit_url && (
              <>
                <span className="text-stone-300">·</span>
                <a
                  href={site.permit_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-amber-700 hover:text-amber-900 hover:bg-amber-50 h-6 px-2 text-xs"
                  >
                    Permits
                    <svg className="w-2.5 h-2.5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </Button>
                </a>
              </>
            )}
          </div>
        </div>

        {/* Right section - Vote count, Image, Vote button */}
        <div className="flex-shrink-0 w-[140px] p-2 flex flex-col items-center gap-2">
          {/* Vote count at top */}
          <div className="text-center">
            <span className="text-lg font-bold text-emerald-700">
              {site.vote_count}
            </span>
            <span className="text-xs text-stone-500 ml-1">
              vote{site.vote_count !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Larger image */}
          <div className="w-full aspect-[4/3] rounded-lg overflow-hidden">
            {imageError ? (
              <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center">
                <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21l6-6 4 4 8-8M3 21h18M3 21V3h18v18" />
                </svg>
              </div>
            ) : (
              <img
                src={photoUrl}
                alt={site.name}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            )}
          </div>

          {/* Vote button at bottom */}
          <Button
            variant={isVoted ? 'default' : 'outline'}
            size="sm"
            onClick={handleVoteClick}
            disabled={!isVoted && !canVote}
            className={cn(
              'transition-all duration-150 active:scale-95 h-8 px-3 text-xs w-full',
              isVoted
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400'
            )}
          >
            {isVoted ? (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
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
