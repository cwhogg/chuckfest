import { emailLayout, escapeHtml } from './layout'
import { rangeLabel } from '@/lib/dates'

export type Message = { subject: string; html: string; text: string; sms: string }

const pacific = (d: Date) =>
  d.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

function build(heading: string, paragraphs: string[], cta: { label: string; url: string }, sms: string): Message {
  return {
    subject: heading,
    html: emailLayout({ heading, body: paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join(''), cta }),
    text: `${paragraphs.join('\n\n')}\n\n${cta.label}: ${cta.url}`,
    sms: `ChuckFest: ${sms} ${cta.url}`,
  }
}

export type PollKind = 'dates' | 'sites' | 'attendance'

const POLL_COPY: Record<PollKind, { ask: string; cta: string }> = {
  dates: { ask: 'mark which summer dates work for you', cta: 'Mark your dates' },
  sites: { ask: 'vote on where we go', cta: 'Vote on sites' },
  attendance: { ask: "tell us if you're in", cta: "I'm in / I'm out" },
}

export function pollInvite(kind: PollKind, year: number, deadline: string | null, url: string): Message {
  const c = POLL_COPY[kind]
  const by = deadline ? ` by ${deadline}` : ''
  return build(
    `ChuckFest ${year}: ${c.ask}`,
    [`It's time to ${c.ask}${by}. It takes about a minute.`],
    { label: c.cta, url },
    `time to ${c.ask}${by}. One tap:`,
  )
}

export function pollNudge(kind: PollKind, year: number, deadline: string, url: string): Message {
  const c = POLL_COPY[kind]
  return build(
    `Reminder: ${c.ask} by ${deadline}`,
    [`We're still missing your answer for ChuckFest ${year}. Please ${c.ask} by ${deadline}.`],
    { label: c.cta, url },
    `reminder to ${c.ask} by ${deadline}.`,
  )
}

export function permitAlarm(opts: {
  siteName: string
  opensAt: Date
  whenLabel: string
  entryPoint: string | null
  permitUrl: string | null
  slot: string | null
  planUrl: string
}): Message {
  const lines = [
    `Permits for ${opts.siteName} open ${pacific(opts.opensAt)} Pacific (in ${opts.whenLabel}).`,
    opts.entryPoint ? `Entry point to select: ${opts.entryPoint}.` : '',
    opts.slot ? `Your slot: ${opts.slot}.` : 'Check the permit-day plan for who is trying which combination.',
    opts.permitUrl ? `Booking page: ${opts.permitUrl}` : '',
  ].filter(Boolean)
  return build(
    `Permit alarm: ${opts.siteName} opens in ${opts.whenLabel}`,
    lines,
    { label: 'Open the permit plan', url: opts.planUrl },
    `${opts.siteName} permits open ${pacific(opts.opensAt)} PT (${opts.whenLabel}).${opts.slot ? ` Your slot: ${opts.slot}.` : ''}`,
  )
}

export function lotteryReminder(name: string, closesOn: string, url: string): Message {
  return build(
    `Lottery closing ${closesOn}: ${name}`,
    [`The ${name} lottery closes ${closesOn}. Make sure our entries are in and logged.`],
    { label: 'Open the lottery tracker', url },
    `${name} lottery closes ${closesOn}.`,
  )
}

export function decisionLocked(kind: 'dates' | 'site' | 'permit', year: number, detail: string, url: string): Message {
  const what = { dates: 'Dates are set', site: "We've picked a site", permit: 'Permit secured' }[kind]
  return build(`ChuckFest ${year}: ${what}`, [`${what}: ${detail}.`], { label: 'See the trip', url }, `${what}: ${detail}.`)
}

export function preTripBriefing(year: number, siteName: string, dates: { startDate: string; endDate: string }, url: string): Message {
  return build(
    `ChuckFest ${year} is one week out`,
    [`${siteName}, ${rangeLabel(dates)}. Check the logistics page for the trailhead, rides and gear list.`],
    { label: 'Trip logistics', url },
    `one week to go! ${siteName}, ${rangeLabel(dates)}. Logistics, rides and gear:`,
  )
}

export function emergencyTripPlan(opts: {
  memberName: string
  contactName: string | null
  siteName: string
  area: string | null
  dates: { startDate: string; endDate: string }
  trailhead: string | null
  groupNames: string[]
}): Omit<Message, 'sms'> {
  const lines = [
    `${opts.memberName} listed you as their emergency contact for a backpacking trip.`,
    `Where: ${opts.siteName}${opts.area ? `, ${opts.area}` : ''}${opts.trailhead ? ` (trailhead: ${opts.trailhead})` : ''}.`,
    `When: ${rangeLabel(opts.dates)}. Expect them back by the evening of the last day.`,
    `Group: ${opts.groupNames.join(', ')}.`,
    'If you have not heard from them by the morning after the last day, contact the county sheriff for the area and share these details.',
  ]
  return {
    subject: `Trip plan: ${opts.memberName} at ${opts.siteName}`,
    html: emailLayout({ heading: 'Backpacking trip plan', body: lines.map((l) => `<p>${escapeHtml(l)}</p>`).join('') }),
    text: lines.join('\n\n'),
  }
}
