import Link from 'next/link'
import { Car, Map as MapIcon, Package, ShieldAlert, Ticket } from 'lucide-react'
import { requireMember } from '@/server/session'
import { getActiveTrip, getAttendance } from '@/server/trips'
import { getSite, listComments } from '@/server/sites'
import { listGear, listRides } from '@/server/logistics'
import { getMemberById } from '@/server/members'
import { Badge, Button, Card, Empty, Field, PageHeader, inputClass } from '@/components/ui'
import { ActionButton } from '@/components/action-button'
import { ActionForm } from '@/components/action-form'
import { rangeLabel } from '@/lib/dates'
import { AttendancePicker } from './attendance-picker'
import { claimGear, dropRide, postTripComment, saveRide, suggestGear, toggleSeat } from './actions'

export const metadata = { title: 'Trip' }

const LOGISTICS_LABELS = {
  trailhead: 'Trailhead',
  parking: 'Parking',
  shuttle: 'Shuttle',
  nightBefore: 'Night before',
  permitPickup: 'Permit pickup',
  meetTime: 'Meet time',
  notes: 'Notes',
} as const

export default async function TripPage() {
  const member = await requireMember()
  const trip = await getActiveTrip()
  if (!trip) return <Empty>No trip is being planned yet.</Empty>

  const [people, site, gear, rides, comments, me] = await Promise.all([
    getAttendance(trip.id),
    trip.siteId ? getSite(trip.siteId) : null,
    listGear(trip.id),
    listRides(trip.id),
    listComments({ tripYearId: trip.id }),
    getMemberById(member.id),
  ])
  const mine = people.find((p) => p.id === member.id)?.status ?? null
  const groups = { in: people.filter((p) => p.status === 'in'), maybe: people.filter((p) => p.status === 'maybe'), out: people.filter((p) => p.status === 'out'), none: people.filter((p) => !p.status) }
  const myRide = rides.find((r) => r.driverId === member.id)
  const logistics = Object.entries(LOGISTICS_LABELS).filter(([k]) => trip.logistics[k as keyof typeof LOGISTICS_LABELS])

  return (
    <div className="space-y-6">
      <PageHeader
        title={`ChuckFest ${trip.year}`}
        subtitle={[site?.name, trip.startDate && trip.endDate ? rangeLabel({ startDate: trip.startDate, endDate: trip.endDate }) : null].filter(Boolean).join(' · ') || 'Dates and site to be decided'}
      />

      <section aria-labelledby="going">
        <h2 id="going" className="mb-2 text-lg font-semibold">
          Are you going?
        </h2>
        <AttendancePicker current={mine} />
        {trip.attendanceDeadline && <p className="mt-2 text-sm text-muted">Please answer by {trip.attendanceDeadline}.</p>}
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
          {(
            [
              ['in', 'In', 'pine'],
              ['maybe', 'Maybe', 'gold'],
              ['out', 'Out', 'ember'],
              ['none', 'No answer', 'quiet'],
            ] as const
          ).map(([key, label, tone]) => (
            <Card key={key} className="p-3">
              <p className="mb-1 flex items-center justify-between font-semibold">
                {label} <Badge tone={tone}>{groups[key].length}</Badge>
              </p>
              <p className="text-muted">{groups[key].map((p) => p.name).join(', ') || '—'}</p>
            </Card>
          ))}
        </div>
      </section>

      {(!me?.emergencyContactName || !me?.phone) && (
        <Link href="/me" className="flex items-center gap-3 rounded-xl border border-gold bg-gold-soft/60 px-4 py-3 text-sm">
          <ShieldAlert size={20} className="shrink-0 text-bark" />
          <span>
            <span className="font-semibold">Add your {!me?.phone ? 'mobile number' : ''}{!me?.phone && !me?.emergencyContactName ? ' and ' : ''}{!me?.emergencyContactName ? 'emergency contact' : ''}</span>
            <span className="block text-muted">So we can text you and send your trip plan to someone at home.</span>
          </span>
        </Link>
      )}

      <section aria-labelledby="logistics">
        <h2 id="logistics" className="mb-2 flex items-center gap-2 text-lg font-semibold">
          <MapIcon size={18} /> Logistics
        </h2>
        {logistics.length ? (
          <Card>
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {logistics.map(([k, label]) => (
                <div key={k}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
                  <dd className="whitespace-pre-wrap text-[15px]">{trip.logistics[k as keyof typeof LOGISTICS_LABELS]}</dd>
                </div>
              ))}
            </dl>
          </Card>
        ) : (
          <Empty>Admins will post the trailhead, meeting time and permit pickup here.</Empty>
        )}
        <Link href="/permits" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-lake">
          <Ticket size={16} /> Permit plan and lotteries
        </Link>
      </section>

      <section aria-labelledby="gear">
        <h2 id="gear" className="mb-2 flex items-center gap-2 text-lg font-semibold">
          <Package size={18} /> Shared gear
        </h2>
        {gear.length ? (
          <ul className="divide-y divide-line rounded-xl border border-line bg-card">
            {gear.map((g) => {
              const myClaim = g.claims.find((c) => c.memberId === member.id)
              return (
                <li key={g.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {g.name}
                      {g.quantityNeeded > 1 && <span className="font-normal text-muted"> ×{g.quantityNeeded}</span>}
                    </p>
                    <p className="text-sm text-muted">
                      {g.claims.length ? g.claims.map((c) => `${c.name}${c.quantity > 1 ? ` (${c.quantity})` : ''}`).join(', ') : 'Nobody yet'}
                      {g.short > 0 && g.claims.length > 0 && <span className="text-ember"> · need {g.short} more</span>}
                    </p>
                  </div>
                  {myClaim ? (
                    <ActionButton action={claimGear.bind(null, g.id, 0)} variant="secondary" size="sm">
                      Not bringing
                    </ActionButton>
                  ) : (
                    <ActionButton action={claimGear.bind(null, g.id, 1)} variant={g.short > 0 ? 'primary' : 'secondary'} size="sm">
                      I&apos;ll bring it
                    </ActionButton>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <Empty>No gear list yet.</Empty>
        )}
        <ActionForm action={suggestGear} className="mt-2 flex gap-2" successMessage={null}>
          <input name="name" required maxLength={100} placeholder="Add an item" className={inputClass} />
          <Button type="submit" variant="secondary">
            Add
          </Button>
        </ActionForm>
      </section>

      <section aria-labelledby="rides">
        <h2 id="rides" className="mb-2 flex items-center gap-2 text-lg font-semibold">
          <Car size={18} /> Rides
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {rides.map((r) => {
            const riding = r.riders.some((x) => x.memberId === member.id)
            return (
              <Card key={r.id}>
                <p className="font-semibold">{r.driverName} is driving</p>
                <p className="text-sm text-muted">
                  {[r.departureCity && `from ${r.departureCity}`, r.departureTime].filter(Boolean).join(', ')}
                  {r.notes ? ` · ${r.notes}` : ''}
                </p>
                <p className="mt-1 text-sm">
                  Riders: {r.riders.map((x) => x.name).join(', ') || 'none yet'} · <span className="font-semibold">{r.seatsLeft} seats left</span>
                </p>
                <div className="mt-2">
                  {r.driverId === member.id ? (
                    <ActionButton action={dropRide.bind(null, r.id)} variant="quiet" size="sm" confirm="Cancel your ride offer?">
                      Cancel my ride
                    </ActionButton>
                  ) : riding ? (
                    <ActionButton action={toggleSeat.bind(null, r.id, false)} variant="secondary" size="sm">
                      Leave this car
                    </ActionButton>
                  ) : (
                    <ActionButton action={toggleSeat.bind(null, r.id, true)} size="sm" disabled={r.seatsLeft <= 0}>
                      Take a seat
                    </ActionButton>
                  )}
                </div>
              </Card>
            )
          })}
          <Card className="border-dashed">
            <p className="font-semibold">{myRide ? 'Update your ride' : 'Driving? Offer seats'}</p>
            <ActionForm action={saveRide} className="mt-2 space-y-2" successMessage={myRide ? 'Updated' : null}>
              <div className="grid grid-cols-[90px_1fr] gap-2">
                <Field label="Seats">
                  <input name="seats" type="number" min={1} max={8} required defaultValue={myRide?.seats ?? 3} className={inputClass} />
                </Field>
                <Field label="From">
                  <input name="departureCity" defaultValue={myRide?.departureCity ?? ''} placeholder="e.g. Oakland" className={inputClass} />
                </Field>
              </div>
              <Field label="Leaving">
                <input name="departureTime" defaultValue={myRide?.departureTime ?? ''} placeholder="e.g. Tue 4pm" className={inputClass} />
              </Field>
              <input name="notes" defaultValue={myRide?.notes ?? ''} placeholder="Notes (optional)" className={inputClass} />
              <Button type="submit" size="sm">
                {myRide ? 'Save' : 'Offer ride'}
              </Button>
            </ActionForm>
          </Card>
        </div>
      </section>

      <section aria-labelledby="talk">
        <h2 id="talk" className="mb-2 text-lg font-semibold">
          Trip discussion
        </h2>
        <ul className="space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg border border-line bg-card px-3 py-2">
              <p className="text-xs text-muted">
                <span className="font-semibold text-ink">{c.name}</span> · {c.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
              <p className="mt-0.5 whitespace-pre-wrap text-[15px]">{c.body}</p>
            </li>
          ))}
        </ul>
        <ActionForm action={postTripComment} className="mt-2 space-y-2" successMessage={null}>
          <textarea name="body" required maxLength={2000} rows={2} placeholder="Say something to the group" className={`${inputClass} h-auto py-2`} />
          <Button type="submit" size="sm">
            Post
          </Button>
        </ActionForm>
      </section>
    </div>
  )
}
