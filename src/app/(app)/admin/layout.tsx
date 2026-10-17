import { requireAdmin } from '@/server/session'
import { AdminNav } from './admin-nav'

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  await requireAdmin()
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-lake">Admin</p>
      <AdminNav />
      <div className="mt-5">{children}</div>
    </div>
  )
}
