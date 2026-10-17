import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AlertTriangle, ExternalLink, Flame } from 'lucide-react'
import { requireMember } from '@/server/session'
import { getActiveTrip, getVotes } from '@/server/trips'
import { getSite, listComments, visitsToSite } from '@/server/sites'
import { nearbyFireHazards } from '@/server/hazards'
import { Badge, Card, PageHeader } from '@/components/ui'
import { SiteMapLazy } from '@/components/site-map-lazy'
import { ActionForm } from '@/components/action-form'
import { ActionButton } from '@/components/action-button'
import { Button, inputClass } from '@/components/ui'
import { closurePage } from '@/lib/closures'
import { permitOpensAt } from '@/lib/permits'
import { VoteButton } from '../vote-button'
import { postSiteComment, removeComment } from '../actions'

const pacific = (d: Date) =>
  d.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

export async function generateMetadata({ params }: PageProps<'/sites/[id]'>) {
  const site = await getSite((await params).id)
  return { title: site?.name ?? 'Site' }
}

export default async function SitePage({ params }: PageProps<'/sites/[id]'>) {
  const member = await requireMember()
  const { id } = await params
  const site = await getSite(id)
  if (!site) notFound()

  const trip = await getActiveTrip()
  const [votes, comments, visits, hazards] = await Promise.all([
    trip ? getVotes(trip.id) : [],
    listComments({ siteId: site.id }),
    visitsToSite(site.id),
    site.latitude != null && site.longitude != null ? nearbyFireHazards(site.latitude, site.longitude) : [],
  ])
  const siteVotes = votes.filter((v) => v.siteId === site.id)
  const myVoteCount = votes.filter((v) => v.memberId === member.id).length
  const opens = trip?.startDate ? permitOpensAt(site, trip.startDate) : null
  const closures = closurePage(site.area)
  const stats = [
    ['Distance', site.distanceMiles != null ? `${site.distanceMiles} mi one way` : null],
    ['Elevation gain', site.elevationGainFt != null ? `${site.elevationGainFt.toLocaleString()} ft` : null],
    ['Camp elevation', site.campElevationFt != null ? `${site.campElevationFt.toLocaleString()} ft` : null],
    ['High point', site.peakElevationFt != null ? `${site.peakElevationFt.toLocaleString()} ft` : null],
    ['Difficulty', site.difficulty],
  ].filter((s): s is [string, string] => !!s[1])
  const scores = [
    ['Scenery', site.sceneryScore, 35],
    ['Experience', site.experienceScore, 25],
    ['Access', site.accessScore, 20],
    ['Permit odds', site.permitScore, 20],
  ] as const

  return (
    <div>
      <Link href="/sites" className="mb-3 inline-block text-sm font-semibold text-lake">
        ← All sites
      </Link>
      <PageHeader
        title={site.name}
        subtitle={[site.area, site.region].filter(Boolean).join(' · ')}
        action={
          <VoteButton
            siteId={site.id}
            voted={siteVotes.some((v) => v.memberId === member.id)}
            count={siteVotes.length}
            canVoteMore={myVoteCount < (trip?.maxSiteVotes ?? 5)}
            locked={!trip || !!trip.siteId}
            size="lg"
          />
        }
      />

      {site.photos.length > 0 && (
        <div className="-mx-4 mb-5 flex snap-x gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {site.photos.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt={site.name} className="h-56 w-auto max-w-[85%] shrink-0 snap-start rounded-xl object-cover sm:h-72" />
          ))}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          {hazards.length > 0 && (
            <Card className="border-ember bg-ember-soft">
              <p className="flex items-center gap-2 font-semibold text-ember">
                <Flame size={18} /> Fire within 3 miles
              </p>
              <ul className="mt-1 space-y-0.5 text-sm text-ink">
                {hazards.map((h) => (
                  <li key={`${h.name}-${h.year}`}>
                    {h.kind === 'active' ? 'Burning now: ' : `Burned in ${h.year}: `}
                    {h.name}
                    {h.acres ? ` (${Math.round(h.acres).toLocaleString()} acres)` : ''}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {site.description && <p className="text-[15px] leading-relaxed">{site.description}</p>}
          {site.rankingNotes && <p className="text-sm italic text-muted">&ldquo;{site.rankingNotes}&rdquo;</p>}

          {stats.length > 0 && (
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {stats.map(([k, v]) => (
                <div key={k} className="rounded-lg border border-line bg-card px-3 py-2">
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd className="font-semibold capitalize text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          <Card>
            <h2 className="text-lg font-semibold">Permits</h2>
            <dl className="mt-2 space-y-1.5 text-sm">
              {site.permitType && (
                <div>
                  <dt className="inline font-semibold">Type: </dt>
                  <dd className="inline">
                    {site.permitType === 'rolling'
                      ? `Rolling, opens ${site.permitAdvanceDays ?? '?'} days before the start date at ${site.permitOpenTime} PT`
                      : site.permitType === 'lottery'
                        ? `Lottery, opens ${site.permitLotteryOpen ?? '?'}`
                        : `Opens on ${site.permitFixedOpenDate ?? '?'} each year`}
                  </dd>
                </div>
              )}
              {opens && (
                <div className="rounded-lg bg-gold-soft px-3 py-2 font-semibold text-bark">For our dates, permits open {pacific(opens)} PT.</div>
              )}
              {site.permitEntryPoint && (
                <div>
                  <dt className="inline font-semibold">Entry point to select: </dt>
                  <dd className="inline">{site.permitEntryPoint}</dd>
                </div>
              )}
              {site.permitGroupSizeLimit && (
                <div>
                  <dt className="inline font-semibold">Group size limit: </dt>
                  <dd className="inline">{site.permitGroupSizeLimit}</dd>
                </div>
              )}
              {site.permitCost != null && (
                <div>
                  <dt className="inline font-semibold">Cost: </dt>
                  <dd className="inline">${site.permitCost} per reservation</dd>
                </div>
              )}
              {site.permitNotes && <p className="text-muted">{site.permitNotes}</p>}
            </dl>
            <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold">
              {site.permitUrl && (
                <a href={site.permitUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-lake">
                  Booking page <ExternalLink size={14} />
                </a>
              )}
              {site.trailInfoUrl && (
                <a href={site.trailInfoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-lake">
                  Trail info <ExternalLink size={14} />
                </a>
              )}
              {closures && (
                <a href={closures} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-lake">
                  <AlertTriangle size={14} /> Closures and alerts
                </a>
              )}
            </div>
          </Card>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Discussion</h2>
            <ul className="space-y-2">
              {comments.map((c) => (
                <li key={c.id} className="rounded-lg border border-line bg-card px-3 py-2">
                  <p className="text-xs text-muted">
                    <span className="font-semibold text-ink">{c.name}</span> · {c.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-[15px]">{c.body}</p>
                  {(c.memberId === member.id || member.role === 'admin') && (
                    <ActionButton action={removeComment.bind(null, c.id, site.id)} variant="quiet" size="sm" confirm="Delete this comment?">
                      Delete
                    </ActionButton>
                  )}
                </li>
              ))}
            </ul>
            <ActionForm action={postSiteComment.bind(null, site.id)} className="mt-3 space-y-2" successMessage={null}>
              <textarea name="body" required maxLength={2000} rows={2} placeholder="Add a thought about this site" className={`${inputClass} h-auto py-2`} />
              <Button type="submit" size="sm">
                Post
              </Button>
            </ActionForm>
          </section>
        </div>

        <aside className="space-y-4">
          {site.latitude != null && site.longitude != null && (
            <SiteMapLazy
              className="h-72"
              sites={[{ id: site.id, name: site.name, latitude: site.latitude, longitude: site.longitude, totalScore: site.totalScore, votes: siteVotes.length }]}
              focus={{ latitude: site.latitude, longitude: site.longitude, zoom: 11 }}
            />
          )}
          {site.totalScore != null && (
            <Card>
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-semibold">Fit for our group</h2>
                <Badge tone="pine">{site.totalScore}/100</Badge>
              </div>
              <ul className="mt-3 space-y-2">
                {scores.map(([label, value, max]) => (
                  <li key={label}>
                    <div className="flex justify-between text-xs">
                      <span>{label}</span>
                      <span className="text-muted">
                        {value ?? '–'}/{max}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-line">
                      <div className="h-1.5 rounded-full bg-pine" style={{ width: `${((value ?? 0) / max) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card>
            <h2 className="text-base font-semibold">Votes</h2>
            <p className="mt-1 text-sm text-muted">{siteVotes.length ? siteVotes.map((v) => v.name).join(', ') : 'No votes yet.'}</p>
            {visits.length > 0 && <p className="mt-2 text-sm">ChuckFest went here in {visits.map((v) => v.year).join(', ')}.</p>}
          </Card>
          {site.sources.length > 0 && (
            <Card>
              <h2 className="text-base font-semibold">Sources</h2>
              <ul className="mt-1 space-y-1 text-sm">
                {site.sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-lake">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </div>
  )
}
