'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
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
    vote_count: number
  }
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

export function SiteCard({
  site,
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
  const router = useRouter()

  const handleCardClick = () => {
    router.push(`/sites/${site.id}`)
  }

  const handleVoteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
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

  return (
    <Card
      ref={setRef}
      className={cn(
        'cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md',
        isSelected && 'ring-2 ring-emerald-500 bg-emerald-50/50',
        isHovered && !isSelected && 'ring-2 ring-emerald-300 bg-emerald-50/30',
        isVoted && 'border-l-4 border-l-emerald-500',
        !isSelected && !isHovered && 'hover:bg-stone-50/50'
      )}
      onClick={handleCardClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Site name */}
            <h3 className="font-semibold text-lg text-stone-900 leading-tight">
              {site.name}
            </h3>

            {/* Region badge */}
            {site.region && (
              <Badge
                variant="secondary"
                className="mt-1.5 text-xs font-normal bg-stone-100 text-stone-600"
              >
                {site.region}
              </Badge>
            )}

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
            </div>

            {/* Description */}
            {truncatedDescription && (
              <p className="mt-2 text-sm text-stone-500 line-clamp-2">
                {truncatedDescription}
              </p>
            )}

            {/* Vote count and permit badge */}
            <div className="flex items-center gap-2 mt-3">
              <span className="text-sm font-medium text-stone-700">
                {site.vote_count} vote{site.vote_count !== 1 ? 's' : ''}
              </span>
              {site.permit_required && (
                <Badge variant="outline" className="text-xs text-amber-700 border-amber-300 bg-amber-50">
                  Permit
                </Badge>
              )}
            </div>
          </div>

          {/* Vote button */}
          <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
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
      </CardContent>
    </Card>
  )
}
