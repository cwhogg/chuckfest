'use server'

import { revalidatePath } from 'next/cache'
import { adminOrThrow } from '@/server/session'
import { attempt } from '@/server/result'
import { deletePastTrip, savePastTrip } from '@/server/history'
import { audit } from '@/server/trips'

const txt = (f: FormData, k: string) => String(f.get(k) ?? '').trim() || null
const num = (f: FormData, k: string) => {
  const v = txt(f, k)
  return v == null || !Number.isFinite(Number(v)) ? null : Number(v)
}
const date = (f: FormData, k: string) => {
  const v = txt(f, k)
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null
}

export async function savePast(id: string | null, formData: FormData) {
  return attempt(async () => {
    const admin = await adminOrThrow()
    const year = num(formData, 'year')
    if (!year || year < 2000 || year > 2100) throw new Error('Enter the year')
    const link = (k: string) => {
      const v = txt(formData, k)
      if (v && !/^https?:\/\//.test(v)) throw new Error(`${k} must be a web link`)
      return v
    }
    const tripId = await savePastTrip(
      id,
      {
        year,
        startDate: date(formData, 'startDate'),
        endDate: date(formData, 'endDate'),
        siteId: txt(formData, 'siteId'),
        locationName: txt(formData, 'locationName'),
        hikeMiles: num(formData, 'hikeMiles'),
        elevationGainFt: num(formData, 'elevationGainFt') == null ? null : Math.round(num(formData, 'elevationGainFt')!),
        campElevationFt: num(formData, 'campElevationFt') == null ? null : Math.round(num(formData, 'campElevationFt')!),
        albumUrl: link('albumUrl'),
        coverPhotoUrl: link('coverPhotoUrl'),
        notes: txt(formData, 'notes'),
      },
      formData.getAll('attendee').map(String),
    )
    await audit(admin.id, id ? 'history.update' : 'history.add', { pastTripId: tripId })
    revalidatePath('/history')
    revalidatePath('/admin/history')
  })
}

export async function removePast(id: string) {
  return attempt(async () => {
    const admin = await adminOrThrow()
    await deletePastTrip(id)
    await audit(admin.id, 'history.delete', { pastTripId: id })
    revalidatePath('/history')
    revalidatePath('/admin/history')
  })
}
