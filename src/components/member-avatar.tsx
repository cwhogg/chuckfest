'use client'

import { cn } from '@/lib/utils'

interface MemberAvatarProps {
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

// Generate a consistent color from a name
function stringToColor(str: string): string {
  // Earthy color palette for retro camping theme
  const colors = [
    'bg-[#a65d4e]',  // rust
    'bg-[#b8923a]',  // ochre
    'bg-[#5e7c5a]',  // sage
    'bg-[#5d6d7a]',  // slate
    'bg-[#c67f5a]',  // clay
    'bg-[#6b5344]',  // bark
    'bg-[#6b7c4c]',  // olive
    'bg-[#8a8279]',  // stone
    'bg-[#9a6b4c]',  // copper
    'bg-[#4a5d42]',  // moss
    'bg-[#5a6a7a]',  // denim
    'bg-[#7a4a52]',  // wine
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
  xs: 'w-5 h-5 text-[10px]',
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
