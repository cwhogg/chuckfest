import Link from 'next/link'
import { Lightbulb } from 'lucide-react'
import { requireMember } from '@/server/session'
import { getActiveTrip, getBackups, getVotes } from '@/server/trips'
import { listSites } from '@/server/sites'
import { ButtonLink, PageHeader } from '@/components/ui'
import { SitesBrowser, type SiteRow } from './sites-browser'

export const metadata = { title: 'Sites' }

export default async function SitesPage() {
  const member = await requireMember()
  const trip = await getActiveTrip()
  const [sites, votes, backups] = await Promise.all([listSites(), trip ? getVotes(trip.id) : [], trip ? getBackups(trip.id) : []])

  const myVotes = votes.filter((v) => v.memberId === member.id).length
  const max = trip?.maxSiteVotes ?? 5
  const votingOpen = !!trip && !trip.siteId

  const rows: SiteRow[] = sites.map((s) => {
    const siteVotes = votes.filter((v) => v.siteId === s.id)
    return {
      id: s.id,
      name: s.name,
      area: s.area,
      region: s.region,
      photo: s.photos[0] ?? null,
      latitude: s.latitude,
      longitude: s.longitude,
      distanceMiles: s.distanceMiles,
      elevationGainFt: s.elevationGainFt,
      totalScore: s.totalScore,
      rankingNotes: s.rankingNotes,
      votes: siteVotes.length,
      voters: siteVotes.map((v) => v.name),
      mine: siteVotes.some((v) => v.memberId === member.id),
      highlight: trip?.siteId === s.id ? 'chosen' : backups.some((b) => b.site.id === s.id) ? 'backup' : undefined,
    }
  })

  return (
    <div>
      <PageHeader
        title="Sites"
        subtitle={
          votingOpen
            ? `${sites.length} sites. You've used ${myVotes} of ${max} votes.`
            : trip?.siteId
              ? 'The site has been chosen. Voting is closed.'
              : `${sites.length} sites.`
        }
        action={
          <ButtonLink href="/ideas" variant="secondary" size="sm">
            <Lightbulb size={16} /> Suggest a hike
          </ButtonLink>
        }
      />
      <SitesBrowser rows={rows} canVoteMore={myVotes < max} votingLocked={!votingOpen} />
      <p className="mt-4 text-xs text-muted">
        Scores use the group&apos;s 100-point system: scenery 35, experience 25, access 20, permit odds 20.{' '}
        <Link href="/history" className="font-semibold text-lake">
          See past trips
        </Link>
      </p>
    </div>
  )
}
