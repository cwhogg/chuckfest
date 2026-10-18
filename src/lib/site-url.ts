/**
 * The app's public origin. APP_URL wins; on a Vercel preview it is the branch URL
 * (so links don't point at production); on production, the production domain.
 */
export function siteOrigin() {
  if (process.env.APP_URL) return process.env.APP_URL
  const env = process.env.VERCEL_ENV
  const host =
    env === 'preview'
      ? (process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL)
      : env === 'production'
        ? process.env.VERCEL_PROJECT_PRODUCTION_URL
        : undefined
  return host ? `https://${host}` : 'http://localhost:3000'
}

/** Every origin a request may legitimately come from on this deployment. */
export function trustedOrigins() {
  const hosts = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]
  return [siteOrigin(), ...hosts.filter(Boolean).map((h) => `https://${h}`)]
}
