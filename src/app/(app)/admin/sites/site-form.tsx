import type { Site } from '@/server/sites'
import { Button, Field, inputClass } from '@/components/ui'
import { ActionForm } from '@/components/action-form'
import type { ActionResult } from '@/server/result'
import { KNOWN_AREAS } from '@/lib/closures'

type Defaults = Partial<Site>

function Text({ name, label, d, hint, type = 'text', placeholder }: { name: keyof Site; label: string; d: Defaults; hint?: string; type?: string; placeholder?: string }) {
  const v = d[name]
  return (
    <Field label={label} hint={hint}>
      <input name={name} type={type} step={type === 'number' ? 'any' : undefined} defaultValue={v == null ? '' : String(v)} placeholder={placeholder} className={inputClass} />
    </Field>
  )
}

export function SiteForm({ action, defaults = {}, submitLabel }: { action: (f: FormData) => Promise<ActionResult<unknown>>; defaults?: Defaults; submitLabel: string }) {
  const d = defaults
  return (
    <ActionForm action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Text name="name" label="Name" d={d} />
        <Field label="Park or forest" hint="Used for closure links.">
          <input name="area" list="known-areas" defaultValue={d.area ?? ''} className={inputClass} />
          <datalist id="known-areas">
            {KNOWN_AREAS.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </Field>
        <Text name="region" label="Region" d={d} placeholder="Eastern Sierra - John Muir Wilderness" />
        <Text name="difficulty" label="Difficulty" d={d} placeholder="moderate" />
      </div>
      <Field label="Description">
        <textarea name="description" rows={3} defaultValue={d.description ?? ''} className={`${inputClass} h-auto py-2`} />
      </Field>

      <fieldset className="grid gap-3 sm:grid-cols-3">
        <legend className="mb-1 text-sm font-semibold text-muted">Trail</legend>
        <Text name="distanceMiles" label="Miles to camp (one way)" type="number" d={d} />
        <Text name="elevationGainFt" label="Gain (ft)" type="number" d={d} />
        <Text name="campElevationFt" label="Camp elevation (ft)" type="number" d={d} />
        <Text name="peakElevationFt" label="High point (ft)" type="number" d={d} />
        <Text name="latitude" label="Latitude" type="number" d={d} />
        <Text name="longitude" label="Longitude" type="number" d={d} />
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-3">
        <legend className="mb-1 text-sm font-semibold text-muted">Permits</legend>
        <Field label="Type">
          <select name="permitType" defaultValue={d.permitType ?? ''} className={inputClass}>
            <option value="">Unknown</option>
            <option value="rolling">Rolling (N days ahead)</option>
            <option value="fixed_date">Fixed date each year</option>
            <option value="lottery">Lottery</option>
          </select>
        </Field>
        <Text name="permitAdvanceDays" label="Days ahead (rolling)" type="number" d={d} />
        <Text name="permitOpenTime" label="Opens at (PT)" d={d} placeholder="07:00" />
        <Text name="permitFixedOpenDate" label="Fixed open date" d={d} placeholder="MM-DD" />
        <Text name="permitLotteryOpen" label="Lottery opens" d={d} placeholder="MM-DD" />
        <Text name="permitLotteryClose" label="Lottery closes" d={d} placeholder="MM-DD" />
        <Text name="permitEntryPoint" label="Entry point to select" d={d} />
        <Text name="permitGroupSizeLimit" label="Group size limit" type="number" d={d} />
        <Text name="permitCost" label="Cost ($)" type="number" d={d} />
        <div className="sm:col-span-3">
          <Text name="permitUrl" label="Booking page" d={d} placeholder="https://www.recreation.gov/permits/…" />
        </div>
        <div className="sm:col-span-3">
          <Field label="Permit notes">
            <textarea name="permitNotes" rows={2} defaultValue={d.permitNotes ?? ''} className={`${inputClass} h-auto py-2`} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <legend className="mb-1 text-sm font-semibold text-muted">Score (total is added up for you)</legend>
        <Text name="sceneryScore" label="Scenery /35" type="number" d={d} />
        <Text name="experienceScore" label="Experience /25" type="number" d={d} />
        <Text name="accessScore" label="Access /20" type="number" d={d} />
        <Text name="permitScore" label="Permit odds /20" type="number" d={d} />
        <div className="col-span-2 sm:col-span-4">
          <Text name="rankingNotes" label="One-line pitch" d={d} placeholder="Why it's epic" />
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Photo links" hint="One per line.">
          <textarea name="photos" rows={3} defaultValue={(d.photos ?? []).join('\n')} className={`${inputClass} h-auto py-2 text-sm`} />
        </Field>
        <Field label="Sources" hint="One per line: Label | https://…">
          <textarea
            name="sources"
            rows={3}
            defaultValue={(d.sources ?? []).map((s) => `${s.label} | ${s.url}`).join('\n')}
            className={`${inputClass} h-auto py-2 text-sm`}
          />
        </Field>
        <Text name="trailInfoUrl" label="Trail info link" d={d} />
        <Field label="Status">
          <select name="status" defaultValue={d.status ?? 'active'} className={inputClass}>
            <option value="active">Active</option>
            <option value="archived">Archived (hidden)</option>
          </select>
        </Field>
      </div>

      <Button type="submit">{submitLabel}</Button>
    </ActionForm>
  )
}
