'use server'

import { revalidatePath } from 'next/cache'
import { memberOrThrow } from '@/server/session'
import { attempt } from '@/server/result'
import { getActiveTrip, removeVote, voteForSite } from '@/server/trips'
import { addComment, deleteComment, getSite } from '@/server/sites'

export async function toggleVote(siteId: string, on: boolean) {
  return attempt(async () => {
    const member = await memberOrThrow()
    const trip = await getActiveTrip()
    if (!trip) throw new Error('No trip is being planned')
    if (!(await getSite(siteId))) throw new Error('Unknown site')
    if (trip.siteId) throw new Error('The site has already been chosen')
    if (on) await voteForSite(member.id, trip.id, siteId)
    else await removeVote(member.id, trip.id, siteId)
    revalidatePath('/sites')
    revalidatePath(`/sites/${siteId}`)
    revalidatePath('/')
  })
}

export async function postSiteComment(siteId: string, formData: FormData) {
  return attempt(async () => {
    const member = await memberOrThrow()
    if (!(await getSite(siteId))) throw new Error('Unknown site')
    await addComment(member.id, { siteId }, String(formData.get('body') ?? ''))
    revalidatePath(`/sites/${siteId}`)
  })
}

export async function removeComment(commentId: string, siteId: string) {
  return attempt(async () => {
    const member = await memberOrThrow()
    await deleteComment(member, commentId)
    revalidatePath(`/sites/${siteId}`)
  })
}
