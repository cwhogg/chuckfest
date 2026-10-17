import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { members, notifications } from '@/db/schema'
import { Badge, Card } from '@/components/ui'
import { ActionButton } from '@/components/action-button'
import { sendTestToMe } from './actions'

export const metadata = { title: 'Admin · Messages' }

export default async function AdminMessagesPage() {
  const log = await db
    .select({ n: notifications, name: members.name })
    .from(notifications)
    .leftJoin(members, eq(members.id, notifications.memberId))
    .orderBy(desc(notifications.createdAt))
    .limit(100)

  const flags = [
    ['Kill switch', process.env.EMAILS_DISABLED === 'true', 'All sending is off'],
    ['Email test mode', process.env.EMAIL_TEST_MODE === 'true', `Every email goes to ${process.env.EMAIL_TEST_RECIPIENT || '(not set)'}`],
    ['Text messages', process.env.SMS_ENABLED === 'true', 'Twilio sending is on'],
  ] as const

  return (
    <div className="space-y-5">
      <Card>
        <h2 className="text-lg font-semibold">Sending status</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {flags.map(([label, on, desc]) => (
            <li key={label} className="flex items-center gap-2">
              <Badge tone={on ? 'gold' : 'quiet'}>{on ? 'On' : 'Off'}</Badge> {label}
              {on && <span className="text-muted">· {desc}</span>}
            </li>
          ))}
          <li className="text-muted">Sender: {process.env.RESEND_FROM_EMAIL || 'ChuckFest <onboarding@resend.dev> (Resend test sender)'}</li>
        </ul>
        <p className="mt-2 text-xs text-muted">These are set as environment variables in Vercel.</p>
        <div className="mt-3">
          <ActionButton action={sendTestToMe} size="sm" variant="secondary">
            Send me a test
          </ActionButton>
        </div>
      </Card>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Recent messages</h2>
        <div className="overflow-x-auto rounded-xl border border-line bg-card">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">To</th>
                <th className="px-3 py-2">What</th>
                <th className="px-3 py-2">Channel</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {log.map(({ n, name }) => (
                <tr key={n.id}>
                  <td className="whitespace-nowrap px-3 py-2 text-muted">
                    {n.createdAt.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </td>
                  <td className="px-3 py-2">{name ?? n.recipient}</td>
                  <td className="px-3 py-2">{n.subject ?? n.kind}</td>
                  <td className="px-3 py-2">{n.channel}</td>
                  <td className="px-3 py-2">
                    <Badge tone={n.status === 'sent' ? 'pine' : n.status === 'failed' ? 'ember' : 'quiet'}>{n.status}</Badge>
                    {n.error && <span className="ml-1 text-xs text-muted">{n.error}</span>}
                  </td>
                </tr>
              ))}
              {!log.length && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted">
                    Nothing sent yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
