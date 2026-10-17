'use server'

import { revalidatePath } from 'next/cache'
import { memberOrThrow } from '@/server/session'
import { attempt } from '@/server/result'
import { updateProfile } from '@/server/members'

const text = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? '').trim()
  return v ? v.slice(0, 200) : null
}

export async function saveProfile(formData: FormData) {
  return attempt(async () => {
    const member = await memberOrThrow()
    const emergencyEmail = text(formData, 'emergencyContactEmail')
    if (emergencyEmail && !/^\S+@\S+\.\S+$/.test(emergencyEmail)) throw new Error('Emergency contact email looks wrong')
    await updateProfile(member.id, {
      name: text(formData, 'name') ?? '',
      phone: text(formData, 'phone'),
      emergencyContactName: text(formData, 'emergencyContactName'),
      emergencyContactPhone: text(formData, 'emergencyContactPhone'),
      emergencyContactEmail: emergencyEmail?.toLowerCase() ?? null,
      diet: text(formData, 'diet'),
      notifyEmail: formData.get('notifyEmail') === 'on',
      notifySms: formData.get('notifySms') === 'on',
    })
    revalidatePath('/', 'layout')
  })
}
