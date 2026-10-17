export type BlackoutInput = { startDate: string; endDate: string; note: string | null }

const ISO = /\d{4}-\d{2}-\d{2}/g

/** Turn US dates (7/4/2027, 07-04-2027) into ISO (2027-07-04). */
function normalize(line: string): string {
  return line.replace(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/g, (_, m, d, y) => `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
}

/**
 * Parse pasted or uploaded blackout dates, one range per line. A line with one
 * date is a single day; with two it's a range; any other text becomes the note.
 *   2027-07-04
 *   7/10/2027 - 7/12/2027, Ian's wedding
 *   start_date,end_date,note   (a CSV header line is ignored)
 */
export function parseBlackouts(text: string): BlackoutInput[] {
  const out: BlackoutInput[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = normalize(raw)
    const dates = line.match(ISO)
    if (!dates) continue
    const [a, b = a] = dates
    const note = line
      .replace(ISO, ' ')
      .replace(/^[\s,;:–-]*(?:to\b|through\b|thru\b)?[\s,;:–-]*/i, '')
      .replace(/^"|"$/g, '')
      .replace(/[\s,;:]+$/, '')
      .trim()
    out.push({ startDate: a <= b ? a : b, endDate: a <= b ? b : a, note: note || null })
  }
  return out
}
