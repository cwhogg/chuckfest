import { NextResponse, type NextRequest } from 'next/server'
import { runScheduledJobs } from '@/server/jobs'

// Vercel Cron calls this every 5 minutes with `Authorization: Bearer $CRON_SECRET`.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const log = await runScheduledJobs()
  return NextResponse.json({ ok: true, log })
}
