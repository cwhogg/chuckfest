'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface SiteCardProps {
  site: {
    id: string
    name: string
    location: string | null
    permit_required: boolean
    vote_count: number
  }
  isVoted: boolean
  canVote: boolean
  onVote: () => void
  onUnvote: () => void
  isSelected?: boolean
  onSelect?: () => void
}

export function SiteCard({
  site,
  isVoted,
  canVote,
  onVote,
  onUnvote,
  isSelected,
  onSelect
}: SiteCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all ${
        isSelected
          ? 'ring-2 ring-emerald-500 bg-emerald-50'
          : 'hover:bg-stone-50'
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Link
              href={`/sites/${site.id}`}
              className="font-medium text-stone-900 hover:text-emerald-700 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {site.name}
            </Link>
            {site.location && (
              <p className="text-sm text-stone-600 mt-1 truncate">
                {site.location}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              {site.permit_required && (
                <Badge variant="outline" className="text-xs">
                  Permit Required
                </Badge>
              )}
              <span className="text-sm text-stone-500">
                {site.vote_count} vote{site.vote_count !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            {isVoted ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onUnvote}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Remove Vote
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={onVote}
                disabled={!canVote}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Vote
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
