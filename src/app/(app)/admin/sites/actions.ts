'use server'

import { revalidatePath } from 'next/cache'
import { adminOrThrow } from '@/server/session'
import { attempt } from '@/server/result'
import { approveIdea, createSite, declineIdea, updateSite, type SiteInput } from '@/server/sites'

const txt = (f: FormData, k: string) => String(f.get(k) ?? '').trim() || null
const num = (f: FormData, k: string) => {
  const v = txt(f, k)
  if (v == null) return null
  const n = Number(v)
  if (!Number.isFinite(n)) throw new Error(`${k} must be a number`)
  return n
}
const int = (f: FormData, k: string) => {
  const n = num(f, k)
  return n == null ? null : Math.round(n)
}
const score = (f: FormData, k: string, max: number) => {
  const n = int(f, k)
  if (n != null && (n < 0 || n > max)) throw new Error(`${k} must be between 0 and ${max}`)
  return n
}
const monthDay = (f: FormData, k: string) => {
  const v = txt(f, k)
  if (v && !/^\d{2}-\d{2}$/.test(v)) throw new Error(`${k} must look like 07-15 (MM-DD)`)
  return v
}
const url = (v: string | null) => {
  if (v && !/^https?:\/\//.test(v)) throw new Error(`"${v}" is not a web link`)
  return v
}

/** Parse the shared site form. Sources: one per line, "Label | https://…". */
function siteFromForm(f: FormData): SiteInput {
  const name = txt(f, 'name')
  if (!name) throw new Error('Name is required')
  const lat = num(f, 'latitude')
  const lng = num(f, 'longitude')
  if ((lat == null) !== (lng == null)) throw new Error('Give both latitude and longitude, or neither')
  const sources = (txt(f, 'sources') ?? '')
    .split('\n')
    .map((line) => line.split('|').map((x) => x.trim()))
    .filter(([a, b]) => a || b)
    .map(([label, link]) => ({ label: link ? label : 'Source', url: url(link ?? label)! }))
  const permitType = txt(f, 'permitType') as SiteInput['permitType']
  return {
    name,
    region: txt(f, 'region'),
    area: txt(f, 'area'),
    description: txt(f, 'description'),
    latitude: lat,
    longitude: lng,
    difficulty: txt(f, 'difficulty'),
    distanceMiles: num(f, 'distanceMiles'),
    elevationGainFt: int(f, 'elevationGainFt'),
    campElevationFt: int(f, 'campElevationFt'),
    peakElevationFt: int(f, 'peakElevationFt'),
    photos: (txt(f, 'photos') ?? '').split('\n').map((s) => url(s.trim())).filter((s): s is string => !!s),
    trailInfoUrl: url(txt(f, 'trailInfoUrl')),
    permitType: permitType && ['rolling', 'fixed_date', 'lottery'].includes(permitType) ? permitType : null,
    permitAdvanceDays: int(f, 'permitAdvanceDays'),
    permitOpenTime: txt(f, 'permitOpenTime') ?? '07:00',
    permitFixedOpenDate: monthDay(f, 'permitFixedOpenDate'),
    permitLotteryOpen: monthDay(f, 'permitLotteryOpen'),
    permitLotteryClose: monthDay(f, 'permitLotteryClose'),
    permitLotteryResults: monthDay(f, 'permitLotteryResults'),
    permitCost: num(f, 'permitCost'),
    permitUrl: url(txt(f, 'permitUrl')),
    permitEntryPoint: txt(f, 'permitEntryPoint'),
    permitGroupSizeLimit: int(f, 'permitGroupSizeLimit'),
    permitNotes: txt(f, 'permitNotes'),
    sceneryScore: score(f, 'sceneryScore', 35),
    experienceScore: score(f, 'experienceScore', 25),
    accessScore: score(f, 'accessScore', 20),
    permitScore: score(f, 'permitScore', 20),
    totalScore: null,
    rankingNotes: txt(f, 'rankingNotes'),
    sources,
    status: f.get('status') === 'archived' ? 'archived' : 'active',
  }
}

const done = () => {
  revalidatePath('/sites')
  revalidatePath('/admin/sites')
  revalidatePath('/admin/ideas')
  revalidatePath('/ideas')
}

export async function saveSite(id: string | null, formData: FormData) {
  return attempt(async () => {
    const admin = await adminOrThrow()
    const input = siteFromForm(formData)
    if (id) {
      await updateSite(admin.id, id, input)
      revalidatePath(`/sites/${id}`)
    } else await createSite(admin.id, input)
    done()
    return id ? 'Saved' : `Added ${input.name}`
  })
}

export async function approveHikeIdea(ideaId: string, formData: FormData) {
  return attempt(async () => {
    const admin = await adminOrThrow()
    const site = await approveIdea(admin.id, ideaId, siteFromForm(formData))
    done()
    return `Added ${site.name} to the sites list`
  })
}

export async function declineHikeIdea(ideaId: string) {
  return attempt(async () => {
    const admin = await adminOrThrow()
    await declineIdea(admin.id, ideaId)
    done()
  })
}
