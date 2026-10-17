import { getActiveTrip, getDatePoll, listBlackouts } from '@/server/trips'
import { requireAdmin } from '@/server/session'
import { Button, Card, Empty, Field, inputClass } from '@/components/ui'
import { ActionButton } from '@/components/action-button'
import { ActionForm } from '@/components/action-form'
import { rangeLabel } from '@/lib/dates'
import { deleteBlackout, importBlackouts, makeDateOptions } from '../actions'

export const metadata = { title: 'Admin · Dates' }

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default async function AdminDatesPage() {
  const admin = await requireAdmin()
  const trip = await getActiveTrip()
  if (!trip) return <Empty>Start a trip first.</Empty>
  const [blackouts, poll] = await Promise.all([listBlackouts(), getDatePoll(trip.id, admin.id)])
  const answered = poll.memberCount - poll.missing.length

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <h2 className="text-lg font-semibold">1. Blackout dates</h2>
        <p className="text-sm text-muted">Dates the group can&apos;t do. Any window that touches one is left out of the poll.</p>
        <ActionForm action={importBlackouts} className="mt-3 space-y-3">
          <Field label="Paste dates" hint="One per line: 2027-07-04, or 7/10/2027 - 7/12/2027, Ian's wedding">
            <textarea name="text" rows={5} className={`${inputClass} h-auto py-2 font-mono text-sm`} />
          </Field>
          <Field label="Or upload a file" hint="CSV or text, same format.">
            <input type="file" name="file" accept=".csv,.txt,text/csv,text/plain" className="block text-sm" />
          </Field>
          <Button type="submit" size="sm">
            Add blackout dates
          </Button>
        </ActionForm>
        {blackouts.length > 0 && (
          <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
            {blackouts.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
                <span>
                  {b.startDate.slice(0, 4)} · {rangeLabel(b)}
                  {b.note && <span className="text-muted"> · {b.note}</span>}
                </span>
                <ActionButton action={deleteBlackout.bind(null, b.id)} variant="quiet" size="sm">
                  Remove
                </ActionButton>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">2. Date options</h2>
        <p className="text-sm text-muted">
          {poll.options.length
            ? `${poll.options.length} options are open; ${answered} of ${poll.memberCount} members have answered.`
            : 'No options yet.'}{' '}
          Regenerating replaces the options and clears answers.
        </p>
        <ActionForm action={makeDateOptions} className="mt-3 grid grid-cols-2 gap-3">
          <Field label="From">
            <input type="date" name="from" defaultValue={`${trip.year}-06-01`} className={inputClass} />
          </Field>
          <Field label="To">
            <input type="date" name="to" defaultValue={`${trip.year}-08-31`} className={inputClass} />
          </Field>
          <Field label="Trips start on">
            <select name="startWeekday" defaultValue="3" className={inputClass}>
              {DAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nights">
            <input type="number" name="nights" min={1} max={10} defaultValue={4} className={inputClass} />
          </Field>
          {poll.options.length > 0 && (
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <input type="checkbox" name="confirmReplace" className="h-4 w-4 accent-ember" />
              Replace the current options and clear everyone&apos;s answers
            </label>
          )}
          <div className="col-span-2">
            <Button type="submit" size="sm">
              {poll.options.length ? 'Regenerate options' : 'Generate options'}
            </Button>
          </div>
        </ActionForm>
        <p className="mt-3 text-sm text-muted">Lock the winning dates from the Dates page.</p>
      </Card>
    </div>
  )
}
