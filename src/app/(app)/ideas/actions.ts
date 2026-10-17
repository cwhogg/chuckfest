'use server'

import { revalidatePath } from 'next/cache'
import { memberOrThrow } from '@/server/session'
import { attempt } from '@/server/result'
import { submitIdea } from '@/server/sites'

export async function suggestHike(formData: FormData) {
  return attempt(async () => {
    const member = await memberOrThrow()
    await submitIdea(member.id, {
      name: String(formData.get('name') ?? ''),
      link: String(formData.get('link') ?? ''),
      notes: String(formData.get('notes') ?? ''),
    })
    revalidatePath('/ideas')
    revalidatePath('/admin/ideas')
  })
}
