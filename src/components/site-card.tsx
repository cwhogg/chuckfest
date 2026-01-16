'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
    permit_entry_point?: string | null
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
  easy: 'bg-[#e8f0e6] text-[#4a5d42] border-[#c9d4c5]',
  moderate: 'bg-[#f5e6c8] text-[#5c4033] border-[#c9b896]',
  strenuous: 'bg-[#f5e0dc] text-[#7a4a52] border-[#d4b8b4]',
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
  const [showDescriptionModal, setShowDescriptionModal] = useState(false)

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
        'overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md bg-[#fffdf9] border-[#e8dcc8]',
        isSelected && 'ring-2 ring-[#2d5016] bg-[#f5f8f4]',
        isHovered && !isSelected && 'ring-2 ring-[#c9b896] bg-[#fdfcf8]',
        isVoted && 'border-l-4 border-l-[#2d5016]',
        !isSelected && !isHovered && 'hover:bg-[#fdfcf8]'
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Main content row */}
      <div className="flex">
        {/* Left section - Content */}
        <div className="flex-1 p-3 pb-0 flex flex-col min-w-0">
          {/* Header: number + name */}
          <div className="flex items-start gap-2">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#2d5016] text-[#faf6f0] font-bold flex items-center justify-center text-xs">
              {number}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-base text-[#3d352e] leading-tight">
                {site.name}
              </h3>
              {site.region && (
                <span className="text-xs text-[#7a7067] mt-0.5 block">
                  {site.region}
                </span>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-[#5c4033]">
            {site.distance_miles !== null && (
              <span className="flex items-center gap-0.5">
                <svg className="w-3 h-3 text-[#7a7067]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                {site.distance_miles}mi
              </span>
            )}
            {site.elevation_gain_ft !== null && (
              <span className="flex items-center gap-0.5">
                <svg className="w-3 h-3 text-[#7a7067]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                {site.elevation_gain_ft.toLocaleString()}ft
              </span>
            )}
            {site.peak_elevation_ft !== null && (
              <span className="flex items-center gap-0.5">
                <svg className="w-3 h-3 text-[#7a7067]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  difficultyColors[site.difficulty.toLowerCase()] || 'bg-[#e8dcc8] text-[#5c4033]'
                )}
              >
                {site.difficulty}
              </Badge>
            )}
          </div>

          {/* Description */}
          {site.description && (
            <button
              onClick={() => setShowDescriptionModal(true)}
              className="mt-2 text-left w-full group"
            >
              <p className="text-xs text-[#7a7067] line-clamp-3 leading-relaxed group-hover:text-[#5c4033] transition-colors">
                {site.description}
              </p>
              {site.description.length > 120 && (
                <span className="text-xs text-[#2d5016] hover:underline mt-0.5 inline-block">
                  Read more
                </span>
              )}
            </button>
          )}
        </div>

        {/* Right section - Vote count, Image, Vote button */}
        <div className="flex-shrink-0 w-[140px] p-2 flex flex-col items-center gap-2">
          {/* Vote count at top */}
          <div className="text-center">
            <span className="text-lg font-bold text-[#2d5016]">
              {site.vote_count}
            </span>
            <span className="text-xs text-[#7a7067] ml-1">
              vote{site.vote_count !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Larger image */}
          <div className="w-full aspect-[4/3] rounded-lg overflow-hidden">
            {imageError ? (
              <div className="w-full h-full bg-gradient-to-br from-[#e8dcc8] to-[#d4c8b4] flex items-center justify-center">
                <svg className="w-10 h-10 text-[#5c4033]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                ? 'bg-[#5a7c52] hover:bg-[#4a6844] text-[#faf6f0]'
                : 'border-[#c9b896] text-[#5c4033] hover:bg-[#e8dcc8] hover:border-[#b8a886]'
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

      {/* Links row - full width below both sections */}
      <div className="flex items-center gap-1 mx-3 mb-3 pt-2 border-t border-[#e8dcc8]">
        <Link href={`/sites/${site.id}`}>
          <Button
            variant="ghost"
            size="sm"
            className="text-[#5c4033] hover:text-[#3d352e] h-6 px-2 text-xs"
          >
            View Details
          </Button>
        </Link>
        {site.trail_info_url && (
          <>
            <span className="text-[#c9b896]">·</span>
            <a
              href={site.trail_info_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="ghost"
                size="sm"
                className="text-[#2d5016] hover:text-[#1a3009] hover:bg-[#e8f0e6] h-6 px-2 text-xs"
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
            <span className="text-[#c9b896]">·</span>
            <a
              href={site.permit_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="ghost"
                size="sm"
                className="text-[#5c4033] hover:text-[#4a3429] hover:bg-[#f5e6c8] h-6 px-2 text-xs"
              >
                Permits
                <svg className="w-2.5 h-2.5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Button>
            </a>
            {site.permit_entry_point && (
              <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 ml-1">
                → {site.permit_entry_point}
              </span>
            )}
          </>
        )}
      </div>

      {/* Description Modal */}
      <Dialog open={showDescriptionModal} onOpenChange={setShowDescriptionModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#3d352e]">{site.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {site.region && (
              <p className="text-sm text-[#7a7067]">{site.region}</p>
            )}
            <p className="text-sm text-[#5c4033] leading-relaxed whitespace-pre-wrap">
              {site.description}
            </p>
            {/* Stats in modal */}
            <div className="flex flex-wrap gap-3 pt-2 border-t border-[#e8dcc8] text-sm text-[#5c4033]">
              {site.distance_miles !== null && (
                <span>{site.distance_miles} mi</span>
              )}
              {site.elevation_gain_ft !== null && (
                <span>{site.elevation_gain_ft.toLocaleString()} ft gain</span>
              )}
              {site.peak_elevation_ft !== null && (
                <span>{site.peak_elevation_ft.toLocaleString()} ft peak</span>
              )}
              {site.difficulty && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs capitalize',
                    difficultyColors[site.difficulty.toLowerCase()] || 'bg-[#e8dcc8] text-[#5c4033]'
                  )}
                >
                  {site.difficulty}
                </Badge>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
