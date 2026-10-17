import { TRIP_STAGES } from '@/db/schema'
import { getActiveTrip } from '@/server/trips'
import { STAGE_LABELS } from '@/server/dashboard'
import { Button, Card, Field, inputClass, cn } from '@/components/ui'
import { ActionButton } from '@/components/action-button'
import { ActionForm } from '@/components/action-form'
import { announce, changeStage, invite, saveTripSettings, startTrip } from './actions'

export const metadata = { title: 'Admin' }

const STAGE_HELP: Record<(typeof TRIP_STAGES)[number], string> = {
  kickoff: 'Set deadlines, upload blackout dates, and generate date options.',
  dates: 'Members mark dates. Nudges go out before the deadline.',
  site: 'Members vote on sites. Pick the site and backups on the Site tab.',
  permits: 'Permit alarms run. Track lotteries and log results on Permits.',
  group: "Members confirm they're in, sort rides and gear.",
  trip: 'Logistics page and emergency trip plans go out.',
  archive: 'Moves the trip into History with everyone who was in.',
}

export default async function AdminTripPage() {
  const trip = await getActiveTrip()

  if (!trip || trip.stage === 'archive') {
    const next = (trip?.year ?? new Date().getFullYear()) + 1
    return (
      <Card className="max-w-md">
        <h1 className="text-xl font-semibold">Start the next trip</h1>
        <p className="mt-1 text-sm text-muted">Creates the trip year. Nothing is sent until you invite people.</p>
        <ActionForm action={startTrip} className="mt-3 flex items-end gap-2" successMessage={null}>
          <Field label="Year">
            <input name="year" type="number" defaultValue={next} className={`${inputClass} w-32`} />
          </Field>
          <Button type="submit">Start {next}</Button>
        </ActionForm>
      </Card>
    )
  }

  const current = TRIP_STAGES.indexOf(trip.stage)
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold">ChuckFest {trip.year}</h1>
        <ol className="mt-3 grid gap-2 sm:grid-cols-7">
          {TRIP_STAGES.map((s, i) => (
            <li key={s}>
              <div className={cn('h-full rounded-lg border p-2 text-sm', i === current ? 'border-gold bg-gold-soft' : i < current ? 'border-pine-soft bg-pine-soft' : 'border-line bg-card')}>
                <p className="font-semibold">
                  {i + 1}. {STAGE_LABELS[s]}
                </p>
                {i !== current && (
                  <ActionButton
                    action={changeStage.bind(null, s)}
                    variant="quiet"
                    size="sm"
                    className="-ml-2 mt-1"
                    confirm={s === 'archive' ? 'Archive this trip into History?' : undefined}
                  >
                    {i < current ? 'Go back' : 'Move here'}
                  </ActionButton>
                )}
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-sm text-muted">Now: {STAGE_HELP[trip.stage]}</p>
      </section>

      <Card>
        <h2 className="text-lg font-semibold">Deadlines and voting</h2>
        <ActionForm action={saveTripSettings} className="mt-3 grid gap-3 sm:grid-cols-4">
          <Field label="Date poll closes">
            <input type="date" name="datePollDeadline" defaultValue={trip.datePollDeadline ?? ''} className={inputClass} />
          </Field>
          <Field label="Site vote closes">
            <input type="date" name="sitePollDeadline" defaultValue={trip.sitePollDeadline ?? ''} className={inputClass} />
          </Field>
          <Field label="Confirm attendance by">
            <input type="date" name="attendanceDeadline" defaultValue={trip.attendanceDeadline ?? ''} className={inputClass} />
          </Field>
          <Field label="Site votes per member">
            <input type="number" name="maxSiteVotes" min={1} max={20} defaultValue={trip.maxSiteVotes} className={inputClass} />
          </Field>
          <div className="sm:col-span-4">
            <Button type="submit" size="sm">
              Save
            </Button>
          </div>
        </ActionForm>
        <p className="mt-2 text-xs text-muted">Members who haven&apos;t answered get reminders at 9am Pacific, 3 days and 1 day before each deadline.</p>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Invite and remind</h2>
        <p className="text-sm text-muted">Each message includes the member&apos;s one-tap sign-in link.</p>
        <div className="mt-3 divide-y divide-line">
          {(
            [
              ['dates', 'Date poll'],
              ['sites', 'Site vote'],
              ['attendance', 'Attendance'],
            ] as const
          ).map(([kind, label]) => (
            <div key={kind} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <p className="font-semibold">{label}</p>
              <div className="flex flex-wrap gap-2">
                <ActionButton action={invite.bind(null, kind, false)} size="sm" confirm={`Invite everyone to the ${label.toLowerCase()}?`}>
                  Invite everyone
                </ActionButton>
                <ActionButton action={invite.bind(null, kind, true)} size="sm" variant="secondary">
                  Remind non-responders
                </ActionButton>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Announce a decision</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <ActionButton action={announce.bind(null, 'dates')} variant="secondary" size="sm" confirm="Tell everyone the dates are set?">
            Dates are set
          </ActionButton>
          <ActionButton action={announce.bind(null, 'site')} variant="secondary" size="sm" confirm="Tell everyone the site?">
            Site is chosen
          </ActionButton>
          <ActionButton action={announce.bind(null, 'permit')} variant="secondary" size="sm" confirm="Tell everyone we have the permit?">
            Permit secured
          </ActionButton>
        </div>
      </Card>
    </div>
  )
}
