import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { requireMember } from '@/server/session'
import { listPastTrips, memberStats } from '@/server/history'
import { Card, Empty, PageHeader } from '@/components/ui'
import { rangeLabel } from '@/lib/dates'

export const metadata = { title: 'History' }

export default async function HistoryPage() {
  await requireMember()
  const trips = await listPastTrips()
  const stats = memberStats(trips)
  const totalMiles = trips.reduce((n, t) => n + (t.trip.hikeMiles ?? 0) * 2, 0)
  const first = trips.at(-1)?.trip.year

  return (
    <div>
      <PageHeader
        title="History"
        subtitle={trips.length ? `${trips.length} trips since ${first}, about ${Math.round(totalMiles)} trail miles round trip.` : undefined}
      />
      {!trips.length && <Empty>No past trips yet.</Empty>}

      <ol className="relative space-y-4 border-l-2 border-line pl-5 sm:ml-2">
        {trips.map(({ trip, siteName, attendees }) => (
          <li key={trip.id} className="relative">
            <span className="absolute -left-[27px] top-5 h-3 w-3 rounded-full border-2 border-paper bg-bark" aria-hidden />
            <Card className="overflow-hidden p-0">
              <div className="sm:flex">
                {trip.coverPhotoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={trip.coverPhotoUrl} alt="" className="h-44 w-full object-cover sm:h-auto sm:w-56" loading="lazy" />
                )}
                <div className="p-4 sm:p-5">
                  <p className="text-sm font-semibold text-muted">
                    {trip.year}
                    {trip.startDate && trip.endDate ? ` · ${rangeLabel({ startDate: trip.startDate, endDate: trip.endDate })}` : ''}
                  </p>
                  <h2 className="text-xl font-semibold">
                    {trip.siteId ? (
                      <Link href={`/sites/${trip.siteId}`} className="hover:underline">
                        {trip.locationName ?? siteName}
                      </Link>
                    ) : (
                      trip.locationName
                    )}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {[
                      trip.hikeMiles != null && `${trip.hikeMiles} mi in`,
                      trip.elevationGainFt != null && `${trip.elevationGainFt.toLocaleString()} ft gain`,
                      trip.campElevationFt != null && `camp at ${trip.campElevationFt.toLocaleString()} ft`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {trip.notes && <p className="mt-2 text-[15px]">{trip.notes}</p>}
                  {attendees.length > 0 && <p className="mt-2 text-sm">{attendees.map((a) => a.name.split(' ')[0]).join(', ')}</p>}
                  {trip.albumUrl && (
                    <a href={trip.albumUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-lake">
                      Photo album <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ol>

      {stats.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-lg font-semibold">The crew</h2>
          <div className="overflow-x-auto rounded-xl border border-line bg-card">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2 text-right">Trips</th>
                  <th className="px-3 py-2 text-right">Trail miles</th>
                  <th className="px-3 py-2 text-right">Gain (ft)</th>
                  <th className="px-3 py-2 text-right">Streak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {stats.map((s) => (
                  <tr key={s.memberId}>
                    <td className="px-3 py-2 font-semibold">{s.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{s.trips}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{s.miles}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{s.gainFt.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{s.streak} yr</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted">Trail miles count the hike in and out. Gain counts the hike in.</p>
        </section>
      )}
    </div>
  )
}
