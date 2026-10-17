/** Where each land manager posts closures and forest orders (checked 2026-10-17). */
const CLOSURE_PAGES: Record<string, string> = {
  'Inyo National Forest': 'https://www.fs.usda.gov/r05/inyo/alerts',
  'Sierra National Forest': 'https://www.fs.usda.gov/r05/sierra/alerts',
  'Stanislaus National Forest': 'https://www.fs.usda.gov/r05/stanislaus/alerts',
  'Eldorado National Forest': 'https://www.fs.usda.gov/r05/eldorado/alerts',
  'Sequoia National Forest': 'https://www.fs.usda.gov/r05/sequoia/alerts',
  'Tahoe National Forest': 'https://www.fs.usda.gov/r05/tahoe/alerts',
  'Lake Tahoe Basin Management Unit': 'https://www.fs.usda.gov/r05/ltbmu/alerts',
  'Humboldt-Toiyabe National Forest': 'https://www.fs.usda.gov/r04/humboldt-toiyabe/alerts',
  'Yosemite National Park': 'https://www.nps.gov/yose/planyourvisit/conditions.htm',
  'Sequoia & Kings Canyon National Parks': 'https://www.nps.gov/seki/planyourvisit/conditions.htm',
}

export function closurePage(area: string | null): string | null {
  return area ? (CLOSURE_PAGES[area] ?? null) : null
}

export const KNOWN_AREAS = Object.keys(CLOSURE_PAGES)
