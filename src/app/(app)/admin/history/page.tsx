import { listPastTrips } from '@/server/history'
import { listMembers } from '@/server/members'
import { listSites } from '@/server/sites'
import { Button, Field, inputClass } from '@/components/ui'
import { ActionButton } from '@/components/action-button'
import { ActionForm } from '@/components/action-form'
import { removePast, savePast } from './actions'

export const metadata = { title: 'Admin · History' }

type Trip = Awaited<ReturnType<typeof listPastTrips>>[number]

export default async function AdminHistoryPage() {
  const [trips, people, sites] = await Promise.all([listPastTrips(), listMembers({ includeInactive: true }), listSites({ includeArchived: true })])

  const form = (t: Trip | null) => {
    const p = t?.trip
    const going = new Set(t?.attendees.map((a) => a.memberId))
    const f = (k: keyof NonNullable<typeof p>) => (p?.[k] == null ? '' : String(p[k]))
    return (
      <ActionForm action={savePast.bind(null, p?.id ?? null)} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Year">
            <input name="year" type="number" required defaultValue={f('year')} className={inputClass} />
          </Field>
          <Field label="Start">
            <input name="startDate" type="date" defaultValue={f('startDate')} className={inputClass} />
          </Field>
          <Field label="End">
            <input name="endDate" type="date" defaultValue={f('endDate')} className={inputClass} />
          </Field>
          <Field label="Site">
            <select name="siteId" defaultValue={f('siteId')} className={inputClass}>
              <option value="">—</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Place name">
            <input name="locationName" defaultValue={f('locationName')} className={inputClass} />
          </Field>
          <Field label="Miles in">
            <input name="hikeMiles" type="number" step="any" defaultValue={f('hikeMiles')} className={inputClass} />
          </Field>
          <Field label="Gain (ft)">
            <input name="elevationGainFt" type="number" defaultValue={f('elevationGainFt')} className={inputClass} />
          </Field>
          <Field label="Camp (ft)">
            <input name="campElevationFt" type="number" defaultValue={f('campElevationFt')} className={inputClass} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Photo album link">
            <input name="albumUrl" defaultValue={f('albumUrl')} className={inputClass} />
          </Field>
          <Field label="Cover photo link">
            <input name="coverPhotoUrl" defaultValue={f('coverPhotoUrl')} className={inputClass} />
          </Field>
        </div>
        <Field label="Notes">
          <textarea name="notes" rows={2} defaultValue={f('notes')} className={`${inputClass} h-auto py-2`} />
        </Field>
        <fieldset>
          <legend className="mb-1 text-sm font-semibold">Who went</legend>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
            {people.map((m) => (
              <label key={m.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="attendee" value={m.id} defaultChecked={going.has(m.id)} className="h-4 w-4 accent-pine" />
                {m.name}
              </label>
            ))}
          </div>
        </fieldset>
        <Button type="submit" size="sm">
          Save trip
        </Button>
      </ActionForm>
    )
  }

  return (
    <div className="space-y-3">
      <details className="rounded-xl border border-dashed border-line bg-card p-4">
        <summary className="cursor-pointer font-semibold">Add a past trip</summary>
        <div className="mt-3">{form(null)}</div>
      </details>
      {trips.map((t) => (
        <details key={t.trip.id} className="rounded-xl border border-line bg-card p-4">
          <summary className="cursor-pointer font-semibold">
            {t.trip.year} · {t.trip.locationName ?? t.siteName} <span className="font-normal text-muted">({t.attendees.length} went)</span>
          </summary>
          <div className="mt-3">{form(t)}</div>
          <div className="mt-3">
            <ActionButton action={removePast.bind(null, t.trip.id)} variant="quiet" size="sm" confirm={`Delete the ${t.trip.year} trip from history?`}>
              Delete trip
            </ActionButton>
          </div>
        </details>
      ))}
    </div>
  )
}
