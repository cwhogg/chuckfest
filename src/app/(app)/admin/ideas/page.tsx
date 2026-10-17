import { listIdeas } from '@/server/sites'
import { Badge, Card, Empty } from '@/components/ui'
import { ActionButton } from '@/components/action-button'
import { SiteForm } from '../sites/site-form'
import { approveHikeIdea, declineHikeIdea } from '../sites/actions'

export const metadata = { title: 'Admin · Ideas' }

export default async function AdminIdeasPage() {
  const ideas = await listIdeas()
  const open = ideas.filter((i) => i.idea.status === 'new')
  const reviewed = ideas.filter((i) => i.idea.status !== 'new')

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        Check each idea against the group&apos;s profile (past trips: 3.6 to 5.5 mi to camp and 1,100 to 2,400 ft gain; no more than 10 mi or 3,500 ft; camp at
        a lake; Western or Eastern Sierra) and the epic bar (scenery 28+ of 35, total 72+). Fill in the details to approve it.
      </p>
      {!open.length && <Empty>No ideas waiting for review.</Empty>}
      {open.map(({ idea, submittedBy }) => (
        <Card key={idea.id}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-lg font-semibold">{idea.name}</p>
              <p className="text-sm text-muted">from {submittedBy ?? 'unknown'}</p>
              {idea.notes && <p className="mt-1 text-[15px]">{idea.notes}</p>}
              {idea.link && (
                <a href={idea.link} target="_blank" rel="noreferrer" className="text-sm text-lake break-all">
                  {idea.link}
                </a>
              )}
            </div>
            <ActionButton action={declineHikeIdea.bind(null, idea.id)} variant="secondary" size="sm" confirm="Decline this idea?">
              Decline
            </ActionButton>
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-semibold text-lake">Approve and add to sites</summary>
            <div className="mt-3">
              <SiteForm
                action={approveHikeIdea.bind(null, idea.id)}
                defaults={{ name: idea.name, sources: idea.link ? [{ label: `Suggested by ${submittedBy ?? 'a member'}`, url: idea.link }] : [] }}
                submitLabel="Approve and add"
              />
            </div>
          </details>
        </Card>
      ))}
      {reviewed.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Reviewed</h2>
          <ul className="space-y-1 text-sm">
            {reviewed.map(({ idea }) => (
              <li key={idea.id} className="flex items-center gap-2">
                <Badge tone={idea.status === 'approved' ? 'pine' : 'quiet'}>{idea.status}</Badge> {idea.name}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
