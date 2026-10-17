import Link from 'next/link'
import { getActiveTrip, getBackups, getVotes } from '@/server/trips'
import { listSites } from '@/server/sites'
import { Button, Card, Empty, Field, inputClass } from '@/components/ui'
import { ActionForm } from '@/components/action-form'
import { saveSiteChoice } from '../actions'

export const metadata = { title: 'Admin · Site' }

export default async function AdminSitePage() {
  const trip = await getActiveTrip()
  if (!trip) return <Empty>Start a trip first.</Empty>
  const [sites, votes, backups] = await Promise.all([listSites(), getVotes(trip.id), getBackups(trip.id)])
  const ranked = sites
    .map((s) => ({ ...s, votes: votes.filter((v) => v.siteId === s.id) }))
    .sort((a, b) => b.votes.length - a.votes.length || (b.totalScore ?? 0) - (a.totalScore ?? 0))
  const voters = new Set(votes.map((v) => v.memberId)).size

  const siteSelect = (name: string, value: string | undefined, placeholder: string) => (
    <select name={name} defaultValue={value ?? ''} className={inputClass}>
      <option value="">{placeholder}</option>
      {ranked.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name} ({s.votes.length} votes)
        </option>
      ))}
    </select>
  )

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <Card>
        <h2 className="text-lg font-semibold">Vote tally</h2>
        <p className="text-sm text-muted">{voters} members have voted.</p>
        <ol className="mt-3 space-y-1.5">
          {ranked
            .filter((s) => s.votes.length > 0)
            .map((s, i) => (
              <li key={s.id} className="flex items-baseline justify-between gap-2 text-sm">
                <span>
                  {i + 1}.{' '}
                  <Link href={`/sites/${s.id}`} className="font-semibold hover:underline">
                    {s.name}
                  </Link>{' '}
                  <span className="text-muted">({s.votes.map((v) => v.name.split(' ')[0]).join(', ')})</span>
                </span>
                <span className="font-semibold tabular-nums">{s.votes.length}</span>
              </li>
            ))}
          {!votes.length && <li className="text-sm text-muted">No votes yet.</li>}
        </ol>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Choose the site</h2>
        <p className="text-sm text-muted">Backups get their own permit windows, in this order, if the first choice sells out.</p>
        <ActionForm action={saveSiteChoice} className="mt-3 space-y-3">
          <Field label="Destination">{siteSelect('siteId', trip.siteId ?? undefined, 'Not chosen')}</Field>
          {[0, 1, 2].map((i) => (
            <Field key={i} label={`Backup ${i + 1}`}>
              {siteSelect('backupId', backups[i]?.site.id, 'None')}
            </Field>
          ))}
          <Button type="submit" size="sm">
            Save choice
          </Button>
        </ActionForm>
        <p className="mt-3 text-sm text-muted">
          Choosing a site closes voting. Then open{' '}
          <Link href="/permits" className="font-semibold text-lake">
            Permits
          </Link>{' '}
          and refresh the windows.
        </p>
      </Card>
    </div>
  )
}
