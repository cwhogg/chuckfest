import { listSites } from '@/server/sites'
import { Badge, Card } from '@/components/ui'
import { SiteForm } from './site-form'
import { saveSite } from './actions'

export const metadata = { title: 'Admin · Sites' }

export default async function AdminSitesPage() {
  const sites = await listSites({ includeArchived: true })
  return (
    <div className="space-y-4">
      <details className="rounded-xl border border-dashed border-line bg-card p-4">
        <summary className="cursor-pointer font-semibold">Add a site</summary>
        <div className="mt-4">
          <SiteForm action={saveSite.bind(null, null)} submitLabel="Add site" />
        </div>
      </details>
      <ul className="space-y-2">
        {sites.map((s) => (
          <li key={s.id}>
            <details className="rounded-xl border border-line bg-card">
              <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-4 py-3">
                <span className="font-semibold">{s.name}</span>
                {s.totalScore != null && <Badge tone="pine">{s.totalScore}</Badge>}
                {s.status === 'archived' && <Badge>Archived</Badge>}
                {!s.permitType && <Badge tone="ember">No permit rules</Badge>}
                {s.latitude == null && <Badge tone="ember">No location</Badge>}
                <span className="text-sm text-muted">{s.area}</span>
              </summary>
              <Card className="m-3 mt-0 border-0 p-0 sm:p-0">
                <SiteForm action={saveSite.bind(null, s.id)} defaults={s} submitLabel="Save site" />
              </Card>
            </details>
          </li>
        ))}
      </ul>
    </div>
  )
}
