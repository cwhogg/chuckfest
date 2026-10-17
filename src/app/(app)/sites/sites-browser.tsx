'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { List, Map as MapIcon } from 'lucide-react'
import { SiteMapLazy } from '@/components/site-map-lazy'
import type { MapSite } from '@/components/site-map'
import { Badge, cn, inputClass } from '@/components/ui'
import { VoteButton } from './vote-button'

export type SiteRow = {
  id: string
  name: string
  area: string | null
  region: string | null
  photo: string | null
  latitude: number | null
  longitude: number | null
  distanceMiles: number | null
  elevationGainFt: number | null
  totalScore: number | null
  rankingNotes: string | null
  votes: number
  voters: string[]
  mine: boolean
  highlight?: 'chosen' | 'backup'
}

type Sort = 'score' | 'votes' | 'distance' | 'name'

export function SitesBrowser({ rows, canVoteMore, votingLocked }: { rows: SiteRow[]; canVoteMore: boolean; votingLocked: boolean }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('score')
  const [view, setView] = useState<'list' | 'map'>('list')

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q ? rows.filter((r) => `${r.name} ${r.area ?? ''} ${r.region ?? ''}`.toLowerCase().includes(q)) : rows
    const by: Record<Sort, (a: SiteRow, b: SiteRow) => number> = {
      score: (a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0),
      votes: (a, b) => b.votes - a.votes || (b.totalScore ?? 0) - (a.totalScore ?? 0),
      distance: (a, b) => (a.distanceMiles ?? 99) - (b.distanceMiles ?? 99),
      name: (a, b) => a.name.localeCompare(b.name),
    }
    return [...filtered].sort(by[sort])
  }, [rows, query, sort])

  const mapSites: MapSite[] = useMemo(
    () =>
      shown
        .filter((r) => r.latitude != null && r.longitude != null)
        .map((r) => ({ id: r.id, name: r.name, latitude: r.latitude!, longitude: r.longitude!, totalScore: r.totalScore, votes: r.votes, highlight: r.highlight })),
    [shown],
  )

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search sites"
          className={cn(inputClass, 'h-10 min-w-0 flex-1 basis-40')}
          aria-label="Search sites"
        />
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={cn(inputClass, 'h-10 w-auto')} aria-label="Sort sites">
          <option value="score">Best match</option>
          <option value="votes">Most votes</option>
          <option value="distance">Shortest hike</option>
          <option value="name">A–Z</option>
        </select>
        <div className="flex rounded-lg border border-line bg-card p-0.5 lg:hidden">
          {(['list', 'map'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn('inline-flex h-9 items-center gap-1 rounded-md px-3 text-sm font-semibold', view === v ? 'bg-pine-soft text-pine' : 'text-muted')}
              aria-pressed={view === v}
            >
              {v === 'list' ? <List size={16} /> : <MapIcon size={16} />}
              {v === 'list' ? 'List' : 'Map'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <ul className={cn('space-y-2', view === 'map' && 'hidden lg:block')}>
          {shown.map((r) => (
            <li key={r.id} className={cn('flex gap-3 rounded-xl border bg-card p-3', r.highlight ? 'border-gold' : 'border-line')}>
              <Link href={`/sites/${r.id}`} className="shrink-0">
                {r.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.photo} alt="" className="h-20 w-20 rounded-lg object-cover sm:h-24 sm:w-24" loading="lazy" />
                ) : (
                  <div className="h-20 w-20 rounded-lg bg-pine-soft sm:h-24 sm:w-24" />
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/sites/${r.id}`} className="font-semibold text-ink hover:underline">
                      {r.name}
                    </Link>
                    <p className="truncate text-xs text-muted">{r.area ?? r.region}</p>
                  </div>
                  <VoteButton siteId={r.id} voted={r.mine} count={r.votes} canVoteMore={canVoteMore} locked={votingLocked} />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                  {r.highlight === 'chosen' && <Badge tone="gold">Chosen</Badge>}
                  {r.highlight === 'backup' && <Badge tone="gold">Backup</Badge>}
                  {r.totalScore != null && <Badge tone="pine">{r.totalScore}/100</Badge>}
                  {r.distanceMiles != null && <span className="text-muted">{r.distanceMiles} mi</span>}
                  {r.elevationGainFt != null && <span className="text-muted">· {r.elevationGainFt.toLocaleString()} ft gain</span>}
                </div>
                {r.rankingNotes && <p className="mt-1 line-clamp-2 text-sm text-muted">{r.rankingNotes}</p>}
                {r.voters.length > 0 && <p className="mt-1 text-xs text-muted">Votes: {r.voters.join(', ')}</p>}
              </div>
            </li>
          ))}
          {!shown.length && <li className="py-6 text-center text-sm text-muted">No sites match.</li>}
        </ul>

        <div className={cn('lg:sticky lg:top-20 lg:h-[calc(100dvh-7rem)]', view === 'list' && 'hidden lg:block')}>
          <SiteMapLazy sites={mapSites} className="h-[calc(100dvh-13rem)] lg:h-full" />
        </div>
      </div>
    </div>
  )
}
