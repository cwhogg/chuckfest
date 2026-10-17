import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { clsx } from 'clsx'

export function cn(...parts: Parameters<typeof clsx>) {
  return clsx(...parts)
}

const buttonStyles = {
  primary: 'bg-pine text-card hover:bg-pine/90',
  secondary: 'bg-card text-ink border border-line hover:bg-paper',
  quiet: 'text-lake hover:bg-lake-soft',
  danger: 'bg-ember text-card hover:bg-ember/90',
} as const

type ButtonVariant = keyof typeof buttonStyles

export function buttonClass(variant: ButtonVariant = 'primary', size: 'md' | 'sm' = 'md') {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none',
    size === 'md' ? 'h-11 px-4 text-[15px]' : 'h-9 px-3 text-sm',
    buttonStyles[variant],
  )
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ComponentProps<'button'> & { variant?: ButtonVariant; size?: 'md' | 'sm' }) {
  return <button className={cn(buttonClass(variant, size), className)} {...props} />
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: 'md' | 'sm' }) {
  return <Link className={cn(buttonClass(variant, size), className)} {...props} />
}

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('rounded-xl border border-line bg-card p-4 sm:p-5', className)} {...props} />
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

const badgeStyles = {
  pine: 'bg-pine-soft text-pine',
  lake: 'bg-lake-soft text-lake',
  gold: 'bg-gold-soft text-bark',
  ember: 'bg-ember-soft text-ember',
  quiet: 'bg-paper text-muted border border-line',
} as const

export function Badge({ tone = 'quiet', className, ...props }: ComponentProps<'span'> & { tone?: keyof typeof badgeStyles }) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', badgeStyles[tone], className)}
      {...props}
    />
  )
}

export const inputClass =
  'h-11 w-full rounded-lg border border-line bg-card px-3 text-[15px] text-ink placeholder:text-muted/70 focus:border-lake focus:outline-none'

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-muted">{children}</p>
}
