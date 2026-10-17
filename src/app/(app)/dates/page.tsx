import { Lock } from 'lucide-react'
import { requireMember } from '@/server/session'
import { getActiveTrip, getDatePoll, listBlackouts } from '@/server/trips'
import { Badge, Card, Empty, PageHeader } from '@/components/ui'
import { ActionButton } from '@/components/action-button'
import { rangeLabel, shortDate } from '@/lib/dates'
import { DateChoice } from './date-row'
import { lockDateOption, unlockTripDates } from './actions'

export const metadata = { title: 'Dates' }

export default async function DatesPage() {
  const member = await requireMember()
  const trip = await getActiveTrip()
  if (!trip) return <Empty>No trip is being planned yet.</Empty>

  const [poll, blackouts] = await Promise.all([getDatePoll(trip.id, member.id), listBlackouts()])
  const locked = trip.startDate && trip.endDate ? { startDate: trip.startDate, endDate: trip.endDate } : null
  const isAdmin = member.role === 'admin'
  const top = poll.ranked.filter((r) => r.yes + r.maybe > 0).slice(0, 3)
  const answered = poll.options.filter((o) => o.mine).length
  const yearBlackouts = blackouts.filter((b) => b.startDate.startsWith(String(trip.year)) || b.endDate.startsWith(String(trip.year)))

  return (
    <div>
      <PageHeader
        title="Dates"
        subtitle={
          locked
            ? 'The trip dates are set.'
            : trip.datePollDeadline
              ? `Mark every window by ${shortDate(trip.datePollDeadline)}.`
              : 'Mark every window that could work for you.'
        }
      />

      {locked && (
        <Card className="mb-5 border-pine bg-pine-soft">
          <p className="flex items-center gap-2 text-sm font-semibold text-pine">
            <Lock size={16} /> Locked
          </p>
          <p className="mt-1 text-2xl font-semibold text-ink">{rangeLabel(locked)}</p>
          {isAdmin && (
            <div className="mt-3">
              <ActionButton action={unlockTripDates} variant="secondary" size="sm" confirm="Reopen the date poll?">
                Unlock dates
              </ActionButton>
            </div>
          )}
        </Card>
      )}

      {!poll.options.length ? (
        <Empty>{isAdmin ? 'Generate date options in Admin to open the poll.' : 'The date poll is not open yet.'}</Empty>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <section aria-label="Date options">
            {!locked && (
              <p className="mb-3 text-sm text-muted">
                You&apos;ve answered {answered} of {poll.options.length}.
              </p>
            )}
            <ul className="space-y-2">
              {poll.options.map((o) => (
                <li key={o.id}>
                  <Card className="p-3 sm:p-4">
                    <div className="mb-2 flex items-baseline justify-between gap-2">
                      <p className="font-semibold text-ink">{rangeLabel(o)}</p>
                      <p className="text-xs text-muted">
                        <span className="font-semibold text-pine">{o.yes} yes</span> · {o.maybe} maybe · {o.no} no
                      </p>
                    </div>
                    <DateChoice optionId={o.id} mine={o.mine} disabled={!!locked} />
                    {(o.yesNames.length > 0 || o.maybeNames.length > 0) && (
                      <p className="mt-2 text-xs text-muted">
                        {o.yesNames.length > 0 && <>Yes: {o.yesNames.join(', ')}. </>}
                        {o.maybeNames.length > 0 && <>Maybe: {o.maybeNames.join(', ')}.</>}
                      </p>
                    )}
                    {isAdmin && !locked && (
                      <div className="mt-2">
                        <ActionButton action={lockDateOption.bind(null, o.id)} variant="quiet" size="sm" confirm={`Lock ${rangeLabel(o)}?`}>
                          Lock these dates
                        </ActionButton>
                      </div>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          </section>

          <aside className="space-y-4">
            <Card>
              <h2 className="text-base font-semibold">Top picks so far</h2>
              {top.length ? (
                <ol className="mt-2 space-y-1.5 text-sm">
                  {top.map((r, i) => (
                    <li key={r.id} className="flex justify-between gap-2">
                      <span>
                        {i + 1}. {rangeLabel(r)}
                      </span>
                      <span className="text-muted">
                        {r.yes} yes, {r.maybe} maybe
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-sm text-muted">No answers yet.</p>
              )}
            </Card>
            <Card>
              <h2 className="text-base font-semibold">
                Waiting on {poll.missing.length} of {poll.memberCount}
              </h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {poll.missing.length ? poll.missing.map((m) => <Badge key={m.id}>{m.name}</Badge>) : <p className="text-sm text-pine">Everyone has answered.</p>}
              </div>
            </Card>
            {yearBlackouts.length > 0 && (
              <Card>
                <h2 className="text-base font-semibold">Already ruled out</h2>
                <ul className="mt-2 space-y-1 text-sm text-muted">
                  {yearBlackouts.map((b) => (
                    <li key={b.id}>
                      {rangeLabel(b)}
                      {b.note ? ` (${b.note})` : ''}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
