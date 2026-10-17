import { listMembers } from '@/server/members'
import { Badge, Button, Card, Field, inputClass } from '@/components/ui'
import { ActionForm } from '@/components/action-form'
import { createMember, importRoster, updateMember } from './actions'
import { LinkTools } from './link-tools'

export const metadata = { title: 'Admin · Members' }

export default async function AdminMembersPage() {
  const people = await listMembers({ includeInactive: true })
  const placeholder = people.filter((p) => p.email.endsWith('.example')).length
  const noPhone = people.filter((p) => p.isActive && !p.phone).length

  return (
    <div className="space-y-5">
      {(placeholder > 0 || noPhone > 0) && (
        <Card className="border-gold bg-gold-soft/50">
          <p className="font-semibold">Roster needs details</p>
          <p className="text-sm">
            {placeholder > 0 && `${placeholder} members still have placeholder emails, so they can't sign in yet. `}
            {noPhone > 0 && `${noPhone} have no mobile number.`} Paste the roster below to fill them in.
          </p>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">Import roster</h2>
          <p className="text-sm text-muted">One person per line: name, email, mobile. Existing members are matched by email or name and updated.</p>
          <ActionForm action={importRoster} className="mt-3 space-y-2">
            <textarea
              name="roster"
              rows={6}
              required
              placeholder={'Brett Smith, brett@example.com, (415) 555-0101\nIan Lee, ian@example.com, 415-555-0102'}
              className={`${inputClass} h-auto py-2 font-mono text-sm`}
            />
            <Button type="submit" size="sm">
              Import
            </Button>
          </ActionForm>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Add a member</h2>
          <ActionForm action={createMember} className="mt-3 space-y-2">
            <input name="name" required placeholder="Name" className={inputClass} />
            <input name="email" type="email" required placeholder="Email" className={inputClass} />
            <input name="phone" type="tel" placeholder="Mobile (optional)" className={inputClass} />
            <Button type="submit" size="sm">
              Add
            </Button>
          </ActionForm>
        </Card>
      </div>

      <ul className="space-y-2">
        {people.map((p) => (
          <li key={p.id}>
            <details className="rounded-xl border border-line bg-card">
              <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-4 py-3">
                <span className="font-semibold">{p.name}</span>
                {p.role === 'admin' && <Badge tone="lake">Admin</Badge>}
                {!p.isActive && <Badge>Inactive</Badge>}
                <span className="text-sm text-muted">
                  {p.email.endsWith('.example') ? 'no email yet' : p.email}
                  {p.phone ? ` · ${p.phone}` : ''}
                </span>
              </summary>
              <div className="space-y-3 border-t border-line px-4 py-3">
                <ActionForm action={updateMember.bind(null, p.id)} className="grid gap-3 sm:grid-cols-3">
                  <Field label="Name">
                    <input name="name" defaultValue={p.name} className={inputClass} />
                  </Field>
                  <Field label="Email">
                    <input name="email" type="email" defaultValue={p.email} className={inputClass} />
                  </Field>
                  <Field label="Mobile">
                    <input name="phone" type="tel" defaultValue={p.phone ?? ''} className={inputClass} />
                  </Field>
                  <Field label="Role">
                    <select name="role" defaultValue={p.role} className={inputClass}>
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </Field>
                  <label className="flex items-center gap-2 self-end pb-2.5 text-sm">
                    <input type="checkbox" name="isActive" defaultChecked={p.isActive} className="h-4 w-4 accent-pine" /> Active
                  </label>
                  <div className="self-end">
                    <Button type="submit" size="sm">
                      Save
                    </Button>
                  </div>
                </ActionForm>
                <div>
                  <p className="mb-1 text-sm font-semibold">Personal sign-in link</p>
                  <LinkTools memberId={p.id} />
                </div>
                {(p.emergencyContactName || p.diet) && (
                  <p className="text-sm text-muted">
                    {p.emergencyContactName && `Emergency: ${p.emergencyContactName} ${p.emergencyContactPhone ?? ''}`}
                    {p.diet && ` · Diet: ${p.diet}`}
                  </p>
                )}
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  )
}
