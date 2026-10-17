import { getActiveTrip } from '@/server/trips'
import { listGear } from '@/server/logistics'
import { Button, Card, Empty, Field, inputClass } from '@/components/ui'
import { ActionButton } from '@/components/action-button'
import { ActionForm } from '@/components/action-form'
import { addDefaultGear, deleteGear, saveLogistics } from '../actions'

export const metadata = { title: 'Admin · Logistics' }

const FIELDS = [
  ['trailhead', 'Trailhead', 'e.g. Agnew Meadows, Reds Meadow Rd'],
  ['parking', 'Parking', 'Where to park and any fees'],
  ['shuttle', 'Shuttle', 'Shuttle times, if required'],
  ['nightBefore', 'Night before', 'Campground or motel'],
  ['permitPickup', 'Permit pickup', 'Ranger station and hours'],
  ['meetTime', 'Meet time', 'e.g. Wed 7:30am at the trailhead'],
] as const

export default async function AdminLogisticsPage() {
  const trip = await getActiveTrip()
  if (!trip) return <Empty>Start a trip first.</Empty>
  const gear = await listGear(trip.id)

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <h2 className="text-lg font-semibold">Trip logistics</h2>
        <p className="text-sm text-muted">Shown to everyone on the Trip page.</p>
        <ActionForm action={saveLogistics} className="mt-3 space-y-3">
          {FIELDS.map(([key, label, placeholder]) => (
            <Field key={key} label={label}>
              <input name={key} defaultValue={trip.logistics[key] ?? ''} placeholder={placeholder} className={inputClass} />
            </Field>
          ))}
          <Field label="Notes">
            <textarea name="notes" rows={3} defaultValue={trip.logistics.notes ?? ''} className={`${inputClass} h-auto py-2`} />
          </Field>
          <Button type="submit" size="sm">
            Save logistics
          </Button>
        </ActionForm>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Gear list</h2>
        {gear.length ? (
          <ul className="mt-2 divide-y divide-line">
            {gear.map((g) => (
              <li key={g.id} className="flex items-center justify-between py-1.5 text-sm">
                <span>
                  {g.name} <span className="text-muted">· {g.claims.map((c) => c.name).join(', ') || 'unclaimed'}</span>
                </span>
                <ActionButton action={deleteGear.bind(null, g.id)} variant="quiet" size="sm" confirm="Remove this item?">
                  Remove
                </ActionButton>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-2">
            <ActionButton action={addDefaultGear} size="sm">
              Add the standard group gear list
            </ActionButton>
          </div>
        )}
        <p className="mt-2 text-sm text-muted">Members can add items from the Trip page.</p>
      </Card>
    </div>
  )
}
