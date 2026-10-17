/**
 * One-time job: find ~20–30 new "epic" Sierra backpacking sites that fit the
 * group's profile, and queue them for admin review as hike ideas.
 *
 * Stages (each saves to data/site-search/, so a re-run resumes where it stopped):
 *   npx tsx scripts/find-sites.ts discover   # web research → candidate list
 *   npx tsx scripts/find-sites.ts research   # per-candidate web research → structured site data
 *   npx tsx scripts/find-sites.ts report     # apply hard filters + epic bar → review.md
 *   npx tsx scripts/find-sites.ts import     # passing sites → hike_ideas (status "new") for admin review
 *
 * Every number the model reports must come with a source URL; the report flags any
 * site missing sources. Admins approve each site on /admin/ideas before it goes live.
 */
import './env'
import fs from 'node:fs'
import path from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import * as z from 'zod'
import { Pool } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import { eq } from 'drizzle-orm'
import { hikeIdeas, members, sites } from '../src/db/schema'

const MODEL = 'claude-opus-5-5'
const OUT = 'data/site-search'
const TARGET_CANDIDATES = 40 // research more than we keep; the epic bar trims to ~20–30

// The group's profile, from data/yosemite_lottery_rankings.md (6 trips, 2020–2025)
// and the scoping doc's hard filters.
const PROFILE = `
The group: about 12 friends on an annual 4-night summer backpacking trip (Wednesday to Sunday) in California's Sierra Nevada.
Past trips (2020–2025): one-way distance to camp 3.6–5.5 mi (avg 4.5), elevation gain 1,078–2,377 ft (avg 1,600),
camp elevation 6,300–11,105 ft and trending higher, moderate difficulty on 5 of 6 trips.
They love: alpine lakes with granite scenery and clear/turquoise water, a basecamp with day hikes from camp, fishing,
high alpine camping (Cottonwood Lakes at 11,105 ft was a hit). Past favorites include Mosquito Lakes, Velma Lakes, East Lake.
Hard limits: Western or Eastern Sierra only (any national park, national forest or wilderness in the Sierra Nevada);
camp at a lake; one-way distance at most 10 mi; gain at most 3,500 ft; overnight permits must allow a group of about 12
(or the group can split into two permits).
They want EPIC trips: iconic, jaw-dropping scenery a group would talk about for years — quality over quantity.
`.trim()

const SCORING = `
Score with the group's 100-point system:
- scenery (0–35): iconic, dramatic alpine lake and granite scenery
- experience (0–25): basecamp quality, day hikes from camp, fishing, swimming, campsites for ~12
- access (0–20): fit to the 3.6–5.5 mi / ~1,600 ft sweet spot and drive/trailhead logistics
- permit (0–20): odds of getting an overnight permit for a group this size (20 = easy, 0 = near impossible)
Be calibrated: Thousand Island Lake scored 81 (35/24/14/8); Lamarck Lakes 79 (28/20/19/12).`.trim()

const Candidate = z.object({
  name: z.string(),
  area: z.string().describe('National park or national forest, e.g. "Inyo National Forest"'),
  trailhead: z.string(),
  why: z.string().describe('One sentence on why it could be epic for this group'),
})
const CandidateList = z.object({ candidates: z.array(Candidate) })

const SiteResult = z.object({
  name: z.string(),
  region: z.string().describe('e.g. "Eastern Sierra - John Muir Wilderness"'),
  area: z.string(),
  description: z.string().describe('2–3 sentences for the group'),
  latitude: z.number().describe('Camp/lake latitude'),
  longitude: z.number().describe('Camp/lake longitude (negative)'),
  difficulty: z.enum(['easy', 'moderate', 'strenuous']),
  distanceMiles: z.number().describe('One-way trail miles from trailhead to camp'),
  elevationGainFt: z.number(),
  campElevationFt: z.number(),
  peakElevationFt: z.number().nullable(),
  campAtLake: z.boolean(),
  inSierraNevada: z.boolean(),
  permitType: z.enum(['rolling', 'fixed_date', 'lottery']).nullable(),
  permitAdvanceDays: z.number().nullable().describe('For rolling permits: days before the start date they open'),
  permitOpenTime: z.string().describe('HH:MM Pacific, e.g. "07:00"'),
  permitLotteryOpen: z.string().nullable().describe('MM-DD if a lottery'),
  permitLotteryClose: z.string().nullable().describe('MM-DD if a lottery'),
  permitEntryPoint: z.string().nullable().describe('Exact entry point / trailhead name in the permit system'),
  permitGroupSizeLimit: z.number().nullable(),
  permitUrl: z.string().nullable(),
  permitNotes: z.string(),
  sceneryScore: z.number(),
  experienceScore: z.number(),
  accessScore: z.number(),
  permitScore: z.number(),
  rankingNotes: z.string().describe('One-line pitch'),
  sources: z.array(z.object({ label: z.string(), url: z.string() })).describe('Every page the facts above came from'),
  caveats: z.string().describe('Anything uncertain, recent closures, burn scars, or conflicting figures'),
})
type SiteResult = z.infer<typeof SiteResult>

const client = new Anthropic()

const webTools: Anthropic.Beta.BetaToolUnion[] = [
  { type: 'web_search_20260209', name: 'web_search', max_uses: 15 },
  { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 10 },
]

/** One research turn with web tools, resuming any pause_turn, returning the final text. */
async function research(prompt: string): Promise<string> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: prompt }]
  for (let continuations = 0; continuations < 6; continuations++) {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 32000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'high' },
      tools: webTools,
      messages,
    })
    const msg = await stream.finalMessage()
    if (msg.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: msg.content })
      continue
    }
    if (msg.stop_reason === 'refusal') throw new Error('Model declined the research request')
    return msg.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
  }
  throw new Error('Research did not finish after 6 continuations')
}

/** Turn research notes into validated JSON (no tools, so no citation/format conflicts). */
async function extract<T extends z.ZodType>(schema: T, notes: string, instruction: string): Promise<z.infer<T>> {
  const msg = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: betaZodOutputFormat(schema) },
    messages: [{ role: 'user', content: `${instruction}\n\n<research_notes>\n${notes}\n</research_notes>` }],
  })
  if (!msg.parsed_output) throw new Error(`Could not parse output (stop_reason: ${msg.stop_reason})`)
  return msg.parsed_output as z.infer<T>
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

async function withDb<T>(fn: (db: ReturnType<typeof drizzle>) => Promise<T>) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    return await fn(drizzle({ client: pool }))
  } finally {
    await pool.end()
  }
}

async function discover() {
  const existing = await withDb((db) => db.select({ name: sites.name }).from(sites))
  const notes = await research(
    `${PROFILE}\n\nWe already know these sites, so skip them: ${existing.map((s) => s.name).join('; ')}.\n\n` +
      `Search the web (trip reports, park and forest pages, guidebook sites) and propose ${TARGET_CANDIDATES} different backpacking ` +
      `destinations in the Sierra Nevada that could be epic for this group and fit the hard limits. Spread them across the range ` +
      `(Desolation/Tahoe, Emigrant/Hoover, Yosemite, Ansel Adams, John Muir, Sequoia–Kings Canyon, Golden Trout). ` +
      `For each: name, managing park or forest, trailhead, and one line on why. Prefer places with strong evidence of iconic scenery.`,
  )
  const { candidates } = await extract(CandidateList, notes, 'Extract every proposed destination from these notes.')
  fs.writeFileSync(path.join(OUT, 'candidates.json'), JSON.stringify(candidates, null, 2))
  console.log(`Saved ${candidates.length} candidates`)
}

async function researchAll() {
  const candidates: z.infer<typeof Candidate>[] = JSON.parse(fs.readFileSync(path.join(OUT, 'candidates.json'), 'utf8'))
  fs.mkdirSync(path.join(OUT, 'results'), { recursive: true })
  for (const c of candidates) {
    const file = path.join(OUT, 'results', `${slug(c.name)}.json`)
    if (fs.existsSync(file)) continue
    console.log(`Researching ${c.name}…`)
    try {
      const notes = await research(
        `${PROFILE}\n\n${SCORING}\n\nResearch this destination thoroughly: ${c.name} (${c.area}, from ${c.trailhead}).\n` +
          `Find, from reliable sources (agency pages, recreation.gov, detailed trip reports): one-way miles to camp, elevation gain, ` +
          `camp elevation, coordinates of the lake, permit system and rules (rolling window days and open time, lottery dates, ` +
          `exact entry point name, group size limit, booking URL), and any recent fire, closure or access problems. ` +
          `Note conflicting figures and which source you trust. Then score it. List every URL you used.`,
      )
      const site = await extract(SiteResult, notes, 'Extract the site data. Use null for anything the notes do not establish; never guess numbers.')
      fs.writeFileSync(file, JSON.stringify({ candidate: c, site, notes }, null, 2))
    } catch (err) {
      console.error(`  failed: ${err instanceof Error ? err.message : err}`)
    }
  }
}

function loadResults(): { site: SiteResult; failures: string[] }[] {
  const dir = path.join(OUT, 'results')
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const { site } = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as { site: SiteResult }
      const total = site.sceneryScore + site.experienceScore + site.accessScore + site.permitScore
      const failures = [
        !site.inSierraNevada && 'not in the Sierra Nevada',
        !site.campAtLake && 'camp not at a lake',
        site.distanceMiles > 10 && `${site.distanceMiles} mi to camp`,
        site.elevationGainFt > 3500 && `${site.elevationGainFt} ft gain`,
        site.sceneryScore < 28 && `scenery ${site.sceneryScore}/35`,
        total < 72 && `total ${total}/100`,
        site.sources.length === 0 && 'no sources',
        site.permitGroupSizeLimit != null && site.permitGroupSizeLimit < 6 && `group limit ${site.permitGroupSizeLimit}`,
      ].filter((x): x is string => !!x)
      return { site, failures }
    })
}

function report() {
  const rows = loadResults().sort(
    (a, b) =>
      b.site.sceneryScore + b.site.experienceScore + b.site.accessScore + b.site.permitScore -
      (a.site.sceneryScore + a.site.experienceScore + a.site.accessScore + a.site.permitScore),
  )
  const pass = rows.filter((r) => !r.failures.length)
  const lines = [
    `# Site search results`,
    ``,
    `${pass.length} of ${rows.length} researched sites pass the filters and the epic bar.`,
    ``,
    `| Site | Area | Mi | Gain | Camp ft | Score | Result |`,
    `| --- | --- | --- | --- | --- | --- | --- |`,
    ...rows.map(({ site: s, failures }) => {
      const total = s.sceneryScore + s.experienceScore + s.accessScore + s.permitScore
      return `| ${s.name} | ${s.area} | ${s.distanceMiles} | ${s.elevationGainFt} | ${s.campElevationFt} | ${total} | ${failures.length ? `Cut: ${failures.join(', ')}` : 'Pass'} |`
    }),
  ]
  fs.writeFileSync(path.join(OUT, 'review.md'), lines.join('\n') + '\n')
  console.log(`${pass.length} pass, ${rows.length - pass.length} cut. See ${OUT}/review.md`)
}

async function importPassing() {
  const pass = loadResults().filter((r) => !r.failures.length)
  await withDb(async (db) => {
    const [chris] = await db.select({ id: members.id }).from(members).where(eq(members.email, 'cwhogg@gmail.com'))
    const existing = new Set((await db.select({ name: hikeIdeas.name }).from(hikeIdeas)).map((r) => r.name))
    let n = 0
    for (const { site: s } of pass) {
      if (existing.has(s.name)) continue
      const draft = {
        name: s.name,
        region: s.region,
        area: s.area,
        description: s.description,
        latitude: s.latitude,
        longitude: s.longitude,
        difficulty: s.difficulty,
        distanceMiles: s.distanceMiles,
        elevationGainFt: Math.round(s.elevationGainFt),
        campElevationFt: Math.round(s.campElevationFt),
        peakElevationFt: s.peakElevationFt == null ? null : Math.round(s.peakElevationFt),
        permitType: s.permitType,
        permitAdvanceDays: s.permitAdvanceDays,
        permitOpenTime: s.permitOpenTime,
        permitLotteryOpen: s.permitLotteryOpen,
        permitLotteryClose: s.permitLotteryClose,
        permitEntryPoint: s.permitEntryPoint,
        permitGroupSizeLimit: s.permitGroupSizeLimit,
        permitUrl: s.permitUrl,
        permitNotes: [s.permitNotes, s.caveats && `Caveats: ${s.caveats}`].filter(Boolean).join(' '),
        sceneryScore: Math.round(s.sceneryScore),
        experienceScore: Math.round(s.experienceScore),
        accessScore: Math.round(s.accessScore),
        permitScore: Math.round(s.permitScore),
        rankingNotes: s.rankingNotes,
        sources: s.sources,
      }
      await db.insert(hikeIdeas).values({
        memberId: chris?.id ?? null,
        name: s.name,
        link: s.sources[0]?.url ?? null,
        notes: `Found by the site search. ${s.rankingNotes}`,
        draft,
      })
      n++
    }
    console.log(`Queued ${n} sites for review at /admin/ideas`)
  })
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const stage = process.argv[2]
  if (stage === 'discover') await discover()
  else if (stage === 'research') await researchAll()
  else if (stage === 'report') report()
  else if (stage === 'import') await importPassing()
  else console.log('Usage: npx tsx scripts/find-sites.ts discover|research|report|import')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
