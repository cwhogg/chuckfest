'use client'

import dynamic from 'next/dynamic'

export const SiteMapLazy = dynamic(() => import('./site-map').then((m) => m.SiteMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-xl bg-line/40" />,
})
