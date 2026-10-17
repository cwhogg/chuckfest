import { TRIP_STAGES, type TripStage } from '@/db/schema'
import { STAGE_LABELS } from '@/server/dashboard'
import { cn } from './ui'

export function StageTracker({ stage }: { stage: TripStage }) {
  const current = TRIP_STAGES.indexOf(stage)
  return (
    <div>
      <ol className="flex items-center gap-1" aria-label="Trip progress">
        {TRIP_STAGES.map((s, i) => (
          <li
            key={s}
            className={cn('h-2 flex-1 rounded-full', i < current ? 'bg-pine' : i === current ? 'bg-gold' : 'bg-line')}
            title={STAGE_LABELS[s]}
            aria-current={i === current ? 'step' : undefined}
          >
            <span className="sr-only">{STAGE_LABELS[s]}</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-sm text-muted">
        Stage {current + 1} of {TRIP_STAGES.length}: <span className="font-semibold text-ink">{STAGE_LABELS[stage]}</span>
      </p>
    </div>
  )
}
