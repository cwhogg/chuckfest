'use client'

import { cn } from '@/lib/utils'

interface MemberAvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

// Generate a consistent color from a name
function stringToColor(str: string): string {
  // Earth-tone palette for the camping/outdoor theme
  const colors = [
    'bg-emerald-600', // Forest green
    'bg-amber-700',   // Brown/amber
    'bg-teal-600',    // Teal
    'bg-orange-600',  // Burnt orange
    'bg-lime-700',    // Olive green
    'bg-yellow-700',  // Mustard
    'bg-cyan-700',    // Deep cyan
    'bg-green-700',   // Hunter green
    'bg-rose-700',    // Dusty rose
    'bg-indigo-600',  // Deep indigo
    'bg-purple-700',  // Plum
    'bg-red-700',     // Brick red
  ]

  // Simple hash function
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }

  return colors[Math.abs(hash) % colors.length]
}

// Get initials from name
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
}

export function MemberAvatar({ name, size = 'md', className }: MemberAvatarProps) {
  const bgColor = stringToColor(name)
  const initials = getInitials(name)

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white',
        bgColor,
        sizeClasses[size],
        className
      )}
    >
      {initials}
    </div>
  )
}
