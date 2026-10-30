/* eslint-disable @next/next/no-img-element -- /media images need the member's cookie, so next/image can't fetch them */
import Link from 'next/link'
import { BellRing, CalendarCheck, Map, Mountain, Tent, Users } from 'lucide-react'
import { requireMember } from '@/server/session'
import { listPastTrips, memberStats } from '@/server/history'
import { listSites, listIdeas } from '@/server/sites'
import { ButtonLink } from '@/components/ui'

export const metadata = { title: 'Welcome' }

const fmt = (n: number) => n.toLocaleString('en-US')

const FEATURES = [
  {
    icon: CalendarCheck,
    title: 'Dates in one tap',
    body: "Every Wed–Sun summer window, with the group's blackout dates already removed. Mark yes, maybe or no and you're done.",
  },
  {
    icon: Map,
    title: 'Pick a site on a real map',
    body: 'Every site on a topo map, with active fires, recent burns, smoke and snow layered on top. Vote for your favorites.',
  },
  {
    icon: BellRing,
    title: 'Never miss a permit',
    body: 'Alarms 3 days, 1 day and 15 minutes before each permit window opens, and a plan for who tries which site.',
  },
  {
    icon: Tent,
    title: 'Trip-ready',
    body: "Who's in, rides and seats, shared gear so we don't bring three stoves, and the trailhead details in one place.",
  },
  {
    icon: Mountain,
    title: 'Every ChuckFest, kept',
    body: 'Past trips, who went, and everyone’s miles, feet climbed and attendance streak.',
  },
  {
    icon: Users,
    title: 'No passwords',
    body: 'A personal link signs you in on any phone. Reminders find the people who haven’t answered, so admins don’t have to.',
  },
]

export default async function WelcomePage() {
  const member = await requireMember()
  const [trips, sites, ideas] = await Promise.all([listPastTrips(), listSites(), listIdeas()])
  const chronological = [...trips].sort((a, b) => a.trip.year - b.trip.year)
  const stats = memberStats(trips)
  const trailMiles = Math.round(trips.reduce((sum, t) => sum + (t.trip.hikeMiles ?? 0) * 2, 0))
  const highest = trips.reduce((best, t) => ((t.trip.campElevationFt ?? 0) > (best?.trip.campElevationFt ?? 0) ? t : best), trips[0])
  const firstYear = chronological[0]?.trip.year
  const newIdeas = ideas.filter((i) => i.idea.status === 'new').length
  const isAdmin = member.role === 'admin'

  return (
    <div className="min-h-dvh bg-paper">
      {/* Hero */}
      <header className="relative overflow-hidden bg-bark text-card">
        <Ridgeline className="absolute inset-x-0 bottom-0 h-24 w-full text-paper sm:h-32" />
        <div className="relative mx-auto grid max-w-5xl items-center gap-8 px-4 pb-28 pt-10 sm:grid-cols-[1.3fr_1fr] sm:pb-36 sm:pt-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-soft">Since {firstYear} · The Sierra Nevada</p>
            <h1 className="mt-3 text-5xl font-semibold leading-none text-card sm:text-7xl">ChuckFest</h1>
            <p className="mt-4 max-w-md text-lg text-card/85">
              {trips.length} summers in the high country, one crew. This is the new home for planning the next one, from &ldquo;when are we going?&rdquo; to permits in
              hand.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/" className="bg-gold text-ink hover:bg-gold/90">
                Open the app
              </ButtonLink>
              {isAdmin && (
                <ButtonLink href="/admin" variant="secondary" className="border-card/30 bg-transparent text-card hover:bg-card/10">
                  Go to Admin
                </ButtonLink>
              )}
            </div>
          </div>
          <div className="relative mx-auto w-56 sm:w-72">
            <img src="/media/chuck2" alt="Chuck, mid-wink, with a beer" className="aspect-square w-full rounded-full ring-8 ring-card/10" />
            <span className="absolute -bottom-2 -left-3 rotate-[-6deg] rounded-full bg-gold px-3 py-1 text-sm font-bold text-ink shadow">Chuck approves</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-16 px-4 pb-16">
        {/* By the numbers */}
        <section aria-label="ChuckFest by the numbers" className="relative z-10 -mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            [String(trips.length), 'trips since ' + firstYear],
            [String(stats.length), 'friends have come'],
            [fmt(trailMiles), 'trail miles, in and out'],
            [fmt(highest?.trip.campElevationFt ?? 0) + ' ft', `highest camp (${highest?.siteName}, ${highest?.trip.year})`],
          ].map(([value, label]) => (
            <div key={label} className="rounded-xl border border-line bg-card p-4">
              <p className="font-display text-3xl font-semibold text-bark">{value}</p>
              <p className="mt-1 text-sm text-muted">{label}</p>
            </div>
          ))}
        </section>

        {/* The trips */}
        <section aria-labelledby="trips-heading">
          <h2 id="trips-heading" className="text-3xl font-semibold">
            Six summers, climbing higher
          </h2>
          <p className="mt-2 max-w-2xl text-muted">
            From the sequoias of Redwood Canyon to Cottonwood Lakes above 11,000 ft. Camps have trended higher almost every year.
          </p>
          <CampChart trips={chronological.map((t) => ({ year: t.trip.year, name: t.siteName ?? '', ft: t.trip.campElevationFt ?? 0 }))} />
          <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...chronological].reverse().map(({ trip, siteName, attendees }) => (
              <li key={trip.id} className="rounded-xl border border-line bg-card p-4">
                <p className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-2xl font-semibold text-ember">{trip.year}</span>
                  <span className="text-xs font-semibold text-muted">{attendees.length} went</span>
                </p>
                <p className="mt-1 font-semibold">{siteName}</p>
                <p className="text-sm text-muted">
                  {trip.hikeMiles} mi in · {fmt(trip.elevationGainFt ?? 0)} ft gain · camp at {fmt(trip.campElevationFt ?? 0)} ft
                </p>
                {trip.notes && <p className="mt-2 text-sm">{trip.notes}</p>}
              </li>
            ))}
          </ol>
        </section>

        {/* What the app does */}
        <section aria-labelledby="app-heading">
          <h2 id="app-heading" className="text-3xl font-semibold">
            Planning, minus the group-text chaos
          </h2>
          <p className="mt-2 max-w-2xl text-muted">Each thing you&apos;re asked to do takes under two minutes on your phone. Everything else happens in the background.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-line bg-card p-5">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-pine-soft text-pine">
                  <Icon size={20} aria-hidden />
                </span>
                <h3 className="mt-3 text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-ink/80">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How a year works */}
        <section aria-labelledby="year-heading" className="grid items-center gap-8 sm:grid-cols-[1fr_1.4fr]">
          <img src="/media/chuck1" alt="Chuck, smiling" className="mx-auto aspect-square w-52 rounded-full sm:w-64" />
          <div>
            <h2 id="year-heading" className="text-3xl font-semibold">
              How a ChuckFest year works
            </h2>
            <ol className="mt-4 space-y-3">
              {[
                ['Pick dates', 'Everyone marks the summer windows that work. The admins lock the winner.'],
                ['Pick a site', `Vote from ${sites.length} sites${newIdeas ? `, plus ${newIdeas} new epic candidates waiting for review` : ''}.`],
                ['Get permits', 'Alarms go off before each window opens; whoever holds a slot logs the result.'],
                ['Confirm the crew', "Say you're in, grab a seat in a car, claim a piece of group gear."],
                ['Go', 'Trailhead details, the emergency trip plan, then four nights of lakes and granite.'],
              ].map(([title, body], i) => (
                <li key={title} className="flex gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold-soft font-display font-semibold text-bark">{i + 1}</span>
                  <p>
                    <span className="font-semibold">{title}.</span> <span className="text-ink/80">{body}</span>
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Closer */}
        <section className="grid items-center gap-6 rounded-2xl bg-pine p-6 text-card sm:grid-cols-[auto_1fr] sm:p-10">
          <img src="/media/chuck3" alt="Chuck, raising a glass" className="mx-auto w-40 rotate-[-3deg] rounded-sm border-[6px] border-card shadow-lg sm:w-48" />
          <div>
            <h2 className="text-3xl font-semibold text-card">Here&apos;s to ChuckFest {(trips[0]?.trip.year ?? 2025) + 2}</h2>
            <p className="mt-2 max-w-lg text-card/85">
              {isAdmin
                ? 'You’re one of the admins. Look around, try every button, and tell Chris what’s confusing. Nothing reaches the group until we launch.'
                : 'Look around and tell the admins what you think.'}
            </p>
            <div className="mt-5">
              <ButtonLink href="/" className="bg-gold text-ink hover:bg-gold/90">
                Open the app
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-6 text-center text-sm text-muted">
        Built for {stats.length} friends · No ads, no sign-up, no passwords ·{' '}
        <Link href="/history" className="font-semibold text-lake">
          Full history
        </Link>
      </footer>
    </div>
  )
}

function CampChart({ trips }: { trips: { year: number; name: string; ft: number }[] }) {
  const max = 12000
  const top = Math.max(...trips.map((t) => t.ft))
  return (
    <figure className="mt-6 rounded-xl border border-line bg-card p-4 sm:p-6">
      <figcaption className="text-sm font-semibold text-muted">Camp elevation by year (ft)</figcaption>
      <div className="mt-4 flex gap-2 sm:gap-4" role="img" aria-label={trips.map((t) => `${t.year}: ${fmt(t.ft)} ft`).join(', ')}>
        {trips.map((t) => (
          <div key={t.year} className="flex flex-1 flex-col items-center">
            <div className="flex h-48 w-full flex-col justify-end">
              <span className="mb-1 text-center text-xs font-semibold text-ink sm:text-sm">{fmt(t.ft)}</span>
              <div className={t.ft === top ? 'w-full rounded-t-md bg-ember' : 'w-full rounded-t-md bg-lake'} style={{ height: `${(t.ft / max) * 85}%` }} />
            </div>
            <span className="mt-2 border-t border-line pt-1 text-xs font-semibold sm:text-sm">{t.year}</span>
            <span className="hidden text-center text-xs text-muted sm:block">{t.name}</span>
          </div>
        ))}
      </div>
    </figure>
  )
}

function Ridgeline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden className={className}>
      <path
        fill="currentColor"
        d="M0 120V78l70-30 55 22 80-52 60 38 45-18 90 44 70-46 60 26 85-58 70 50 55-20 80 40 65-34 75 30 70-22 60 26 70-30 40 14V120Z"
      />
    </svg>
  )
}
