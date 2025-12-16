'use client'

import { cn } from '@/lib/utils'

export type TripStage = 'start' | 'dates_selected' | 'site_selected' | 'permits_obtained' | 'group_confirmed' | 'chuckfest'

interface ProgressTrackerProps {
  currentStage: TripStage
  className?: string
}

const stages: { id: TripStage; label: string; shortLabel: string }[] = [
  { id: 'start', label: 'Start', shortLabel: 'Start' },
  { id: 'dates_selected', label: 'Dates Selected', shortLabel: 'Dates' },
  { id: 'site_selected', label: 'Site Selected', shortLabel: 'Site' },
  { id: 'permits_obtained', label: 'Permits Obtained', shortLabel: 'Permits' },
  { id: 'group_confirmed', label: 'Group Confirmed', shortLabel: 'Group' },
  { id: 'chuckfest', label: 'Chuckfest', shortLabel: 'Trip' },
]

function getStageIndex(stage: TripStage): number {
  return stages.findIndex(s => s.id === stage)
}

export function ProgressTracker({ currentStage, className }: ProgressTrackerProps) {
  const currentIndex = getStageIndex(currentStage)

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop view */}
      <div className="hidden sm:block">
        <div className="flex items-center justify-between relative">
          {/* Background line */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-[#e8dcc8]" />

          {/* Progress line */}
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-[#2d5016] transition-all duration-500"
            style={{ width: `${(currentIndex / (stages.length - 1)) * 100}%` }}
          />

          {stages.map((stage, index) => {
            const isCompleted = index < currentIndex
            const isCurrent = index === currentIndex
            const isFuture = index > currentIndex

            return (
              <div key={stage.id} className="relative flex flex-col items-center z-10">
                {/* Circle */}
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border-2',
                    isCompleted && 'bg-[#2d5016] border-[#2d5016]',
                    isCurrent && 'bg-[#2d5016] border-[#2d5016] ring-4 ring-[#e8f0e6] scale-110',
                    isFuture && 'bg-[#fffdf9] border-[#c9b896]'
                  )}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  ) : isCurrent ? (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  ) : (
                    <div className="w-2 h-2 bg-[#c9b896] rounded-full" />
                  )}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    'mt-2 text-xs font-medium text-center whitespace-nowrap',
                    isCompleted && 'text-[#2d5016]',
                    isCurrent && 'text-[#2d5016] font-bold',
                    isFuture && 'text-[#7a7067]'
                  )}
                >
                  {stage.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile view - compact */}
      <div className="sm:hidden">
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {stages.map((stage, index) => {
            const isCompleted = index < currentIndex
            const isCurrent = index === currentIndex
            const isFuture = index > currentIndex

            return (
              <div key={stage.id} className="flex items-center">
                <div className="flex flex-col items-center min-w-[60px]">
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 border',
                      isCompleted && 'bg-[#2d5016] border-[#2d5016]',
                      isCurrent && 'bg-[#2d5016] border-[#2d5016] ring-2 ring-[#e8f0e6]',
                      isFuture && 'bg-[#fffdf9] border-[#c9b896]'
                    )}
                  >
                    {isCompleted ? (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    ) : isCurrent ? (
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      'mt-1 text-[10px] font-medium text-center',
                      isCompleted && 'text-[#2d5016]',
                      isCurrent && 'text-[#2d5016] font-bold',
                      isFuture && 'text-[#7a7067]'
                    )}
                  >
                    {stage.shortLabel}
                  </span>
                </div>
                {index < stages.length - 1 && (
                  <div
                    className={cn(
                      'w-4 h-0.5 -mt-4',
                      index < currentIndex ? 'bg-[#2d5016]' : 'bg-[#e8dcc8]'
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Helper function to determine current stage based on trip data
export function getCurrentStage({
  datesLocked,
  siteSelected,
  permitsObtained,
  allMembersResponded,
  tripStarted,
}: {
  datesLocked: boolean
  siteSelected: boolean
  permitsObtained: boolean
  allMembersResponded: boolean
  tripStarted: boolean
}): TripStage {
  if (tripStarted) return 'chuckfest'
  if (permitsObtained && allMembersResponded) return 'group_confirmed'
  if (permitsObtained) return 'permits_obtained'
  if (siteSelected) return 'site_selected'
  if (datesLocked) return 'dates_selected'
  return 'start'
}
