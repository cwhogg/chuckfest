import { ExternalLink } from 'lucide-react'
import { requireMember } from '@/server/session'
import { getActiveTrip } from '@/server/trips'
import { getPermitPlan, listLotteries } from '@/server/permits'
import { listSites } from '@/server/sites'
import { listMembers } from '@/server/members'
import { Badge, Button, Card, Empty, Field, PageHeader, inputClass } from '@/components/ui'
import { ActionButton } from '@/components/action-button'
import { ActionForm } from '@/components/action-form'
import { Countdown } from '@/components/countdown'
import { rangeLabel } from '@/lib/dates'
import { assignSlot, logOutcome, logPermitWin, removeLotteryEntry, saveLotteryEntry, syncWindows, unassignSlot, volunteer } from './actions'

export const metadata = { title: 'Permits' }

const pacific = (d: Date) =>
  d.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

const OUTCOME = {
  pending: ['Pending', 'quiet'],
  got_it: ['Got it!', 'pine'],
  sold_out: ['Sold out', 'ember'],
  failed: ['Failed', 'ember'],
} as const

const LOTTERY_RESULT = { not_entered: ['Not entered', 'quiet'], entered: ['Entered', 'lake'], won: ['Won', 'pine'], lost: ['Lost', 'ember'] } as const

export default async function PermitsPage() {
  const member = await requireMember()
  const trip = await getActiveTrip()
  if (!trip) return <Empty>No trip is being planned yet.</Empty>
  const isAdmin = member.role === 'admin'

  const [plan, lotteries, sites, roster] = await Promise.all([
    getPermitPlan(trip.id),
    listLotteries(trip.id),
    isAdmin ? listSites() : Promise.resolve([]),
    isAdmin ? listMembers() : Promise.resolve([]),
  ])
  const isVolunteer = plan.volunteers.some((v) => v.id === member.id)
  const candidates = [...plan.admins, ...plan.volunteers.filter((v) => !plan.admins.some((a) => a.id === v.id))]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permits"
        subtitle={
          plan.secured
            ? 'We have a permit. Nice work.'
            : trip.startDate
              ? `For ${rangeLabel({ startDate: trip.startDate, endDate: trip.endDate ?? trip.startDate })}. Popular permits go in minutes, so we split up who tries what.`
              : 'Permit windows appear once dates and a site are locked.'
        }
      />

      {!isAdmin && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">{isVolunteer ? "You're on the permit-day team" : 'Help on permit day?'}</p>
            <p className="text-sm text-muted">The 3 admins try by default. Volunteers get a slot and an alarm.</p>
          </div>
          <ActionButton action={volunteer.bind(null, !isVolunteer)} variant={isVolunteer ? 'secondary' : 'primary'} size="sm">
            {isVolunteer ? 'Step back' : "I'll help"}
          </ActionButton>
        </Card>
      )}

      {isAdmin && (
        <div className="flex flex-wrap items-center gap-3">
          <ActionButton action={syncWindows} variant="secondary" size="sm">
            Refresh permit windows
          </ActionButton>
          <p className="text-sm text-muted">
            Builds a window for the chosen site and each backup from the locked dates.
            {plan.volunteers.length > 0 && ` Volunteers: ${plan.volunteers.map((v) => v.name).join(', ')}.`}
          </p>
        </div>
      )}

      <section aria-labelledby="windows" className="space-y-3">
        <h2 id="windows" className="text-lg font-semibold">
          Permit-day plan
        </h2>
        {!plan.windows.length && <Empty>No permit windows yet.</Empty>}
        {plan.windows.map(({ window, site, attempts, role }) => (
          <Card key={window.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="flex items-center gap-2 text-lg font-semibold">
                  {site.name} <Badge tone={role === 'chosen' ? 'gold' : 'quiet'}>{role === 'chosen' ? 'First choice' : 'Backup'}</Badge>
                </p>
                <p className="text-sm text-muted">
                  Opens {pacific(window.opensAt)} PT · <span className="font-semibold text-bark"><Countdown to={window.opensAt.toISOString()} /></span>
                </p>
                {site.permitEntryPoint && <p className="text-sm">Entry point: {site.permitEntryPoint}</p>}
              </div>
              {site.permitUrl && (
                <a href={site.permitUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-lake">
                  Booking page <ExternalLink size={14} />
                </a>
              )}
            </div>

            <ol className="mt-3 space-y-2">
              {attempts.map(({ attempt, memberName }) => {
                const [label, tone] = OUTCOME[attempt.outcome]
                const canLog = isAdmin || attempt.memberId === member.id
                return (
                  <li key={attempt.id} className="rounded-lg border border-line px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm">
                        <span className="font-semibold">#{attempt.priority}</span> {memberName ?? 'Unassigned'}
                        {attempt.notes && <span className="text-muted"> · {attempt.notes}</span>}
                      </p>
                      <Badge tone={tone}>{label}</Badge>
                    </div>
                    {attempt.confirmationNumber && <p className="mt-1 text-sm">Confirmation: {attempt.confirmationNumber}</p>}
                    {canLog && attempt.outcome === 'pending' && (
                      <div className="mt-2 flex flex-wrap items-end gap-2">
                        <ActionForm action={logPermitWin.bind(null, attempt.id)} className="flex items-end gap-2" successMessage={null}>
                          <input name="confirmation" placeholder="Confirmation #" className={`${inputClass} h-9 w-40`} />
                          <Button type="submit" size="sm" className="whitespace-nowrap">
                            Got it
                          </Button>
                        </ActionForm>
                        <ActionButton action={logOutcome.bind(null, attempt.id, 'sold_out', undefined)} variant="secondary" size="sm">
                          Sold out
                        </ActionButton>
                        {isAdmin && (
                          <ActionButton action={unassignSlot.bind(null, attempt.id)} variant="quiet" size="sm">
                            Remove
                          </ActionButton>
                        )}
                      </div>
                    )}
                    {canLog && attempt.outcome !== 'pending' && (
                      <ActionButton action={logOutcome.bind(null, attempt.id, 'pending', undefined)} variant="quiet" size="sm">
                        Undo
                      </ActionButton>
                    )}
                  </li>
                )
              })}
            </ol>

            {isAdmin && (
              <ActionForm action={assignSlot.bind(null, window.id)} className="mt-3 flex flex-wrap items-end gap-2" successMessage={null}>
                <select name="memberId" className={`${inputClass} h-9 w-auto`} defaultValue="">
                  <option value="">Choose who tries</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input name="notes" placeholder="e.g. Wed–Sun, 8 people" className={`${inputClass} h-9 w-52`} />
                <Button type="submit" size="sm" variant="secondary">
                  Add slot
                </Button>
              </ActionForm>
            )}
          </Card>
        ))}
      </section>

      <section aria-labelledby="lotteries" className="space-y-3">
        <h2 id="lotteries" className="text-lg font-semibold">
          Lotteries
        </h2>
        {!lotteries.length && <Empty>No lotteries tracked yet.</Empty>}
        {lotteries.map(({ entry, memberName, siteName }) => {
          const [label, tone] = LOTTERY_RESULT[entry.result]
          return (
            <Card key={entry.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{entry.lotteryName}</p>
                  <p className="text-sm text-muted">
                    {[siteName, memberName && `entered by ${memberName}`, entry.datesRequested && `dates: ${entry.datesRequested}`].filter(Boolean).join(' · ')}
                  </p>
                  <p className="text-sm text-muted">
                    {[entry.closesOn && `closes ${entry.closesOn}`, entry.resultsOn && `results ${entry.resultsOn}`].filter(Boolean).join(' · ')}
                  </p>
                  {entry.notes && <p className="mt-1 text-sm">{entry.notes}</p>}
                </div>
                <Badge tone={tone}>{label}</Badge>
              </div>
              {isAdmin && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-semibold text-lake">Edit</summary>
                  <LotteryForm id={entry.id} entry={entry} sites={sites} roster={roster} />
                  <div className="mt-2">
                    <ActionButton action={removeLotteryEntry.bind(null, entry.id)} variant="quiet" size="sm" confirm="Delete this lottery entry?">
                      Delete
                    </ActionButton>
                  </div>
                </details>
              )}
            </Card>
          )
        })}
        {isAdmin && (
          <details className="rounded-xl border border-dashed border-line bg-card p-4">
            <summary className="cursor-pointer font-semibold">Track a lottery</summary>
            <LotteryForm id={null} sites={sites} roster={roster} />
          </details>
        )}
      </section>
    </div>
  )
}

function LotteryForm({
  id,
  entry,
  sites,
  roster,
}: {
  id: string | null
  entry?: { lotteryName: string; siteId: string | null; memberId: string | null; datesRequested: string | null; closesOn: string | null; resultsOn: string | null; result: string; notes: string | null }
  sites: { id: string; name: string }[]
  roster: { id: string; name: string }[]
}) {
  return (
    <ActionForm action={saveLotteryEntry.bind(null, id)} className="mt-3 grid gap-3 sm:grid-cols-2">
      <Field label="Lottery">
        <input name="lotteryName" required defaultValue={entry?.lotteryName} placeholder="e.g. Yosemite wilderness permit lottery" className={inputClass} />
      </Field>
      <Field label="Site">
        <select name="siteId" defaultValue={entry?.siteId ?? ''} className={inputClass}>
          <option value="">—</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Entered by">
        <select name="memberId" defaultValue={entry?.memberId ?? ''} className={inputClass}>
          <option value="">—</option>
          {roster.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Dates requested">
        <input name="datesRequested" defaultValue={entry?.datesRequested ?? ''} placeholder="e.g. Jul 14 – 18, Jul 21 – 25" className={inputClass} />
      </Field>
      <Field label="Closes on">
        <input name="closesOn" type="date" defaultValue={entry?.closesOn ?? ''} className={inputClass} />
      </Field>
      <Field label="Results on">
        <input name="resultsOn" type="date" defaultValue={entry?.resultsOn ?? ''} className={inputClass} />
      </Field>
      <Field label="Status">
        <select name="result" defaultValue={entry?.result ?? 'entered'} className={inputClass}>
          <option value="not_entered">Not entered yet</option>
          <option value="entered">Entered</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>
      </Field>
      <Field label="Notes">
        <input name="notes" defaultValue={entry?.notes ?? ''} className={inputClass} />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" size="sm">
          Save lottery
        </Button>
      </div>
    </ActionForm>
  )
}
