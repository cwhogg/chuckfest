'use server'

import { revalidatePath } from 'next/cache'
import { adminOrThrow } from '@/server/session'
import { attempt } from '@/server/result'
import { getMemberById } from '@/server/members'
import { deliver } from '@/server/jobs'
import { emailLayout } from '@/emails/layout'

export async function sendTestToMe() {
  return attempt(async () => {
    const admin = await adminOrThrow()
    const me = await getMemberById(admin.id)
    if (!me) throw new Error('Unknown member')
    const results = await deliver(
      me,
      {
        subject: 'ChuckFest test message',
        html: emailLayout({ heading: 'It works', body: '<p>This is a test from the ChuckFest admin page.</p>' }),
        text: 'This is a test from the ChuckFest admin page.',
        sms: 'ChuckFest: test message from the admin page.',
      },
      'test',
      `test:${me.id}:${Date.now()}`,
    )
    revalidatePath('/admin/messages')
    const summary = results.map((r) => r.status + (r.error ? ` (${r.error})` : '')).join(', ')
    return `Result: ${summary || 'nothing sent (both channels off in your profile)'}`
  })
}
