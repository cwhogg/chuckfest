import { requireMember } from '@/server/session'
import { getMemberById } from '@/server/members'
import { Button, Card, Field, PageHeader, inputClass } from '@/components/ui'
import { ActionForm } from '@/components/action-form'
import { saveProfile } from './actions'
import { SignOutButton } from './sign-out'

export const metadata = { title: 'Your profile' }

export default async function MePage() {
  const { id } = await requireMember()
  const me = (await getMemberById(id))!

  return (
    <div className="max-w-xl">
      <PageHeader title="Your profile" subtitle={me.email} />
      <ActionForm action={saveProfile} className="space-y-5">
        <Card className="space-y-3">
          <Field label="Name">
            <input name="name" required defaultValue={me.name} className={inputClass} autoComplete="name" />
          </Field>
          <Field label="Mobile number" hint="For text alerts and one-tap vote links.">
            <input name="phone" type="tel" defaultValue={me.phone ?? ''} placeholder="(555) 555-0100" className={inputClass} autoComplete="tel" />
          </Field>
          <Field label="Dietary needs" hint="Allergies or preferences for shared meals.">
            <input name="diet" defaultValue={me.diet ?? ''} placeholder="e.g. vegetarian" className={inputClass} />
          </Field>
        </Card>

        <Card className="space-y-3">
          <div>
            <h2 className="text-base font-semibold">Emergency contact</h2>
            <p className="text-sm text-muted">The day before the trip, we email them where you&apos;ll be and when you&apos;ll be back.</p>
          </div>
          <Field label="Name">
            <input name="emergencyContactName" defaultValue={me.emergencyContactName ?? ''} className={inputClass} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Phone">
              <input name="emergencyContactPhone" type="tel" defaultValue={me.emergencyContactPhone ?? ''} className={inputClass} />
            </Field>
            <Field label="Email">
              <input name="emergencyContactEmail" type="email" defaultValue={me.emergencyContactEmail ?? ''} className={inputClass} />
            </Field>
          </div>
        </Card>

        <Card className="space-y-2">
          <h2 className="text-base font-semibold">Notifications</h2>
          <label className="flex items-center gap-3">
            <input type="checkbox" name="notifyEmail" defaultChecked={me.notifyEmail} className="h-5 w-5 accent-pine" />
            <span>Email</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" name="notifySms" defaultChecked={me.notifySms} className="h-5 w-5 accent-pine" />
            <span>Text messages</span>
          </label>
        </Card>

        <Button type="submit" className="w-full sm:w-auto">
          Save
        </Button>
      </ActionForm>

      <div className="mt-8 border-t border-line pt-5">
        <SignOutButton />
      </div>
    </div>
  )
}
