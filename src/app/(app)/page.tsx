import Link from 'next/link'
import { ArrowRight, CalendarCheck, Mountain, Ticket, Users } from 'lucide-react'
import { requireMember } from '@/server/session'
import { getActiveTrip, getAttendance, getBackups } from '@/server/trips'
import { getSite } from '@/server/sites'
import { getPermitPlan } from '@/server/permits'
import { getTodos } from '@/server/dashboard'
import { StageTracker } from '@/components/stage-tracker'
import { ButtonLink, Card, Empty } from '@/components/ui'
import { rangeLabel } from '@/lib/dates'

export default async function HomePage() {
  const member = await requireMember()
  const trip = await getActiveTrip()

  if (!trip) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">Hi, {member.name.split(' ')[0]}</h1>
        <Empty>
          No trip is being planned yet.
          {member.role === 'admin' && (
            <>
              {' '}
              <Link href="/admin" className="font-semibold text-lake">
                Start the next trip
              </Link>
            </>
          )}
        </Empty>
      </div>
    )
  }

  const [todos, site, backups, plan, people] = await Promise.all([
    getTodos(trip, member.id),
    trip.siteId ? getSite(trip.siteId) : null,
    getBackups(trip.id),
    getPermitPlan(trip.id),
    getAttendance(trip.id),
  ])
  const inCount = people.filter((p) => p.status === 'in').length
  const maybeCount = people.filter((p) => p.status === 'maybe').length

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">ChuckFest {trip.year}</p>
        <h1 className="mt-1 text-3xl font-semibold">Hi, {member.name.split(' ')[0]}</h1>
      </div>

      <Card>
        <StageTracker stage={trip.stage} />
      </Card>

      <section aria-labelledby="todo-heading">
        <h2 id="todo-heading" className="mb-2 text-lg font-semibold">
          Your to-do
        </h2>
        {todos.length ? (
          <ul className="space-y-2">
            {todos.map((t) => (
              <li key={t.key}>
                <Link
                  href={t.href}
                  className="flex items-center justify-between gap-3 rounded-xl border-2 border-gold bg-gold-soft/50 px-4 py-3 font-semibold text-ink"
                >
                  <span>
                    {t.label}
                    {t.due && <span className="block text-sm font-normal text-muted">by {t.due}</span>}
                  </span>
                  <ArrowRight size={18} className="shrink-0 text-bark" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl bg-pine-soft px-4 py-3 text-sm font-semibold text-pine">You&apos;re all caught up.</p>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <CalendarCheck size={18} /> Dates
          </h3>
          <p className="mt-1 text-lg font-semibold text-ink">
            {trip.startDate && trip.endDate ? rangeLabel({ startDate: trip.startDate, endDate: trip.endDate }) : 'Not set yet'}
          </p>
          <Link href="/dates" className="mt-2 inline-block text-sm font-semibold text-lake">
            {trip.startDate ? 'See the poll' : 'Go to the date poll'}
          </Link>
        </Card>

        <Card>
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Mountain size={18} /> Destination
          </h3>
          {site ? (
            <>
              <Link href={`/sites/${site.id}`} className="mt-1 block text-lg font-semibold text-ink">
                {site.name}
              </Link>
              {backups.length > 0 && <p className="text-sm text-muted">Backups: {backups.map((b) => b.site.name).join(', ')}</p>}
            </>
          ) : (
            <p className="mt-1 text-lg font-semibold text-ink">Not chosen yet</p>
          )}
          <Link href="/sites" className="mt-2 inline-block text-sm font-semibold text-lake">
            Browse sites
          </Link>
        </Card>

        <Card>
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Ticket size={18} /> Permits
          </h3>
          <p className="mt-1 text-lg font-semibold text-ink">
            {plan.secured ? 'Secured' : plan.windows.length ? `${plan.windows.length} window${plan.windows.length > 1 ? 's' : ''} planned` : 'No plan yet'}
          </p>
          <Link href="/permits" className="mt-2 inline-block text-sm font-semibold text-lake">
            Permit plan
          </Link>
        </Card>

        <Card>
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Users size={18} /> Who&apos;s in
          </h3>
          <p className="mt-1 text-lg font-semibold text-ink">
            {inCount} in{maybeCount ? `, ${maybeCount} maybe` : ''}
          </p>
          <Link href="/trip" className="mt-2 inline-block text-sm font-semibold text-lake">
            Trip details
          </Link>
        </Card>
      </div>

      {member.role === 'admin' && (
        <ButtonLink href="/admin" variant="secondary" className="w-full sm:w-auto">
          Open admin tools
        </ButtonLink>
      )}
    </div>
  )
}
