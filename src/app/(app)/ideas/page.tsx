import Link from 'next/link'
import { requireMember } from '@/server/session'
import { listIdeas } from '@/server/sites'
import { Badge, Button, Card, Field, PageHeader, inputClass } from '@/components/ui'
import { ActionForm } from '@/components/action-form'
import { suggestHike } from './actions'

export const metadata = { title: 'Hike ideas' }

const STATUS = { new: ['Waiting for review', 'gold'], approved: ['Added to sites', 'pine'], declined: ['Not this time', 'quiet'] } as const

export default async function IdeasPage() {
  await requireMember()
  const ideas = await listIdeas()

  return (
    <div className="max-w-2xl">
      <PageHeader title="Hike ideas" subtitle="Know a great trip? Suggest it. An admin checks it against our criteria and adds it to the sites list." />
      <Card>
        <ActionForm action={suggestHike} className="space-y-3" successMessage="Thanks! The admins will take a look.">
          <Field label="Hike or destination">
            <input name="name" required maxLength={200} placeholder="e.g. Garnet Lake via Agnew Meadows" className={inputClass} />
          </Field>
          <Field label="Link (optional)" hint="A trip report, AllTrails page or anything useful.">
            <input name="link" type="url" placeholder="https://" className={inputClass} />
          </Field>
          <Field label="Why it would be a great ChuckFest (optional)">
            <textarea name="notes" rows={3} maxLength={2000} className={`${inputClass} h-auto py-2`} />
          </Field>
          <Button type="submit">Suggest it</Button>
        </ActionForm>
      </Card>

      {ideas.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-lg font-semibold">Suggestions</h2>
          <ul className="space-y-2">
            {ideas.map(({ idea, submittedBy }) => {
              const [label, tone] = STATUS[idea.status]
              return (
                <li key={idea.id} className="rounded-xl border border-line bg-card px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">
                      {idea.siteId ? (
                        <Link href={`/sites/${idea.siteId}`} className="hover:underline">
                          {idea.name}
                        </Link>
                      ) : (
                        idea.name
                      )}
                    </p>
                    <Badge tone={tone}>{label}</Badge>
                  </div>
                  <p className="text-xs text-muted">from {submittedBy ?? 'a former member'}</p>
                  {idea.notes && <p className="mt-1 text-sm">{idea.notes}</p>}
                  {idea.link && (
                    <a href={idea.link} target="_blank" rel="noreferrer" className="mt-1 inline-block break-all text-sm text-lake">
                      {idea.link}
                    </a>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
