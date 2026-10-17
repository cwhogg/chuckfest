/**
 * One-time import from the old Supabase project into Neon. Safe to re-run:
 * rows are matched on legacy_id (or email for members) and updated in place.
 *
 *   npx tsx scripts/import-legacy.ts
 *
 * Sources:
 * - Old Supabase REST API (sites, past trips, attendees, member names)
 * - data/sites_ranked.csv: newer research (verified distances, scores) wins over the old DB
 * - data/private/members.csv (gitignored, optional): name,email,phone,role,legacy_name
 *   Real contact details live only here, never in the public repo.
 */
import './env'
import fs from 'node:fs'
import { parse } from 'csv-parse/sync'
import { Pool } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import { eq, sql } from 'drizzle-orm'
import * as schema from '../src/db/schema'

const { members, sites, pastTrips, pastTripAttendees } = schema

// Seed admins (from the scoping doc). Keyed by the first name used in the old DB.
const ADMINS: Record<string, { name: string; email: string }> = {
  Chris: { name: 'Chris Hogg', email: 'cwhogg@gmail.com' },
  Jason: { name: 'Jason Roberts', email: 'vanillafro@gmail.com' },
  Alex: { name: 'Alex Fisch', email: 'alex.fisch@gmail.com' },
}

type Row = Record<string, string | number | boolean | null | string[]>

async function fetchOld(table: string): Promise<Row[]> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!base || !key) throw new Error('Old Supabase env vars are missing')
  const res = await fetch(`${base}/rest/v1/${table}?select=*`, { headers: { apikey: key } })
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`)
  return res.json()
}

const num = (v: unknown) => (v === '' || v == null ? null : Number(v))
const int = (v: unknown) => (num(v) == null ? null : Math.round(Number(v)))
const str = (v: unknown) => (v === '' || v == null ? null : String(v))

function readCsv(file: string): Record<string, string>[] {
  if (!fs.existsSync(file)) return []
  return parse(fs.readFileSync(file), { columns: true, skip_empty_lines: true, trim: true })
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const db = drizzle({ client: pool, schema })

  // --- Members --------------------------------------------------------------
  const roster = readCsv('data/private/members.csv')
  const oldMembers = await fetchOld('members')
  const memberIdByLegacy = new Map<string, string>()

  for (const old of oldMembers) {
    const firstName = String(old.name)
    const fromRoster = roster.find((r) => (r.legacy_name || r.name) === firstName)
    const admin = ADMINS[firstName]
    const email = (fromRoster?.email || admin?.email || String(old.email)).toLowerCase()
    const values = {
      name: fromRoster?.name || admin?.name || firstName,
      email,
      phone: str(fromRoster?.phone),
      role: (admin || fromRoster?.role === 'admin' ? 'admin' : 'member') as 'admin' | 'member',
      isActive: old.is_active !== false,
      legacyId: String(old.id),
    }
    const [row] = await db
      .insert(members)
      .values(values)
      .onConflictDoUpdate({
        target: members.legacyId,
        set: { name: values.name, email: values.email, role: values.role, isActive: values.isActive, ...(values.phone ? { phone: values.phone } : {}) },
      })
      .returning({ id: members.id })
    memberIdByLegacy.set(String(old.id), row.id)
  }

  // Roster entries with no old record (new members)
  for (const r of roster.filter((r) => !oldMembers.some((o) => o.name === (r.legacy_name || r.name)))) {
    await db
      .insert(members)
      .values({ name: r.name, email: r.email.toLowerCase(), phone: str(r.phone), role: r.role === 'admin' ? 'admin' : 'member' })
      .onConflictDoUpdate({ target: members.email, set: { name: r.name, phone: str(r.phone) } })
  }
  console.log(`Members: ${oldMembers.length} from old DB, ${roster.length} roster rows`)

  // --- Sites ----------------------------------------------------------------
  const ranked = readCsv('data/sites_ranked.csv')
  const oldSites = await fetchOld('sites')
  const siteIdByLegacy = new Map<string, string>()

  for (const old of oldSites) {
    const csv = ranked.find((r) => r.name === old.name)
    const pick = (csvKey: string, oldKey = csvKey) => (csv && csv[csvKey] !== '' ? csv[csvKey] : old[oldKey])
    const sources = [
      ...(str(pick('trail_info_url')) ? [{ label: 'Trail info', url: String(pick('trail_info_url')) }] : []),
      ...(str(pick('permit_url')) ? [{ label: 'Permits', url: String(pick('permit_url')) }] : []),
    ]
    const values = {
      name: String(old.name),
      region: str(pick('region')),
      area: str(csv?.national_park || old.national_forest),
      description: str(pick('description')),
      latitude: num(pick('latitude')),
      longitude: num(pick('longitude')),
      difficulty: str(pick('difficulty')),
      distanceMiles: num(pick('distance_miles')),
      elevationGainFt: int(pick('elevation_gain_ft')),
      peakElevationFt: int(pick('peak_elevation_ft')),
      photos: Array.isArray(old.photos) ? (old.photos as string[]) : [],
      trailInfoUrl: str(pick('trail_info_url')),
      permitType: str(pick('permit_type')) as 'rolling' | 'fixed_date' | 'lottery' | null,
      permitAdvanceDays: int(pick('permit_advance_days')),
      permitOpenTime: str(pick('permit_open_time')) ?? '07:00',
      permitFixedOpenDate: str(old.permit_fixed_open_date),
      permitLotteryOpen: str(old.permit_lottery_open),
      permitLotteryClose: str(old.permit_lottery_close),
      permitLotteryResults: str(old.permit_lottery_results),
      permitCost: num(pick('permit_cost')),
      permitUrl: str(pick('permit_url')),
      permitEntryPoint: str(pick('permit_entry_point')),
      permitNotes: str(pick('permit_notes')),
      sceneryScore: int(csv?.scenery_score),
      experienceScore: int(csv?.experience_score),
      accessScore: int(csv?.accessibility_score),
      permitScore: int(csv?.permit_score),
      totalScore: int(csv?.total_score),
      rankingNotes: str(csv?.ranking_notes),
      sources,
      status: (old.status === 'archived' ? 'archived' : 'active') as 'active' | 'archived',
      legacyId: String(old.id),
    }
    const [row] = await db
      .insert(sites)
      .values(values)
      .onConflictDoUpdate({ target: sites.legacyId, set: { ...values, updatedAt: sql`now()` } })
      .returning({ id: sites.id })
    siteIdByLegacy.set(String(old.id), row.id)
  }
  console.log(`Sites: ${oldSites.length} (${ranked.length} with scores from CSV)`)

  // --- Past trips -----------------------------------------------------------
  const oldTrips = await fetchOld('past_trips')
  const tripIdByLegacy = new Map<string, string>()
  for (const old of oldTrips) {
    const values = {
      year: Number(old.year),
      startDate: str(old.start_date),
      endDate: str(old.end_date),
      siteId: old.site_id ? (siteIdByLegacy.get(String(old.site_id)) ?? null) : null,
      locationName: str(old.location_name),
      hikeMiles: num(old.hike_miles),
      elevationGainFt: int(old.elevation_gain_ft),
      campElevationFt: int(old.campsite_elevation_ft),
      albumUrl: str(old.album_url),
      coverPhotoUrl: str(old.cover_photo_url),
      notes: str(old.notes),
      legacyId: String(old.id),
    }
    const [row] = await db
      .insert(pastTrips)
      .values(values)
      .onConflictDoUpdate({ target: pastTrips.legacyId, set: values })
      .returning({ id: pastTrips.id })
    tripIdByLegacy.set(String(old.id), row.id)
  }

  const oldAttendees = await fetchOld('past_trip_attendees')
  let attendeeCount = 0
  for (const a of oldAttendees) {
    const pastTripId = tripIdByLegacy.get(String(a.past_trip_id))
    const memberId = memberIdByLegacy.get(String(a.member_id))
    if (!pastTripId || !memberId) continue
    await db.insert(pastTripAttendees).values({ pastTripId, memberId }).onConflictDoNothing()
    attendeeCount++
  }
  console.log(`Past trips: ${oldTrips.length}, attendees: ${attendeeCount}`)

  const admins = await db.select({ name: members.name }).from(members).where(eq(members.role, 'admin'))
  console.log(`Admins: ${admins.map((a) => a.name).join(', ')}`)
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
