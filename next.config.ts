import type { NextConfig } from 'next'

// Every page here is per-member and dynamic, so Cache Components is off; external
// map/fire data is cached per request with `fetch(..., { next: { revalidate } })`.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
}

export default nextConfig
