import { ProfileForm } from '@/components/forms/ProfileForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const SettingsPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm onSubmit={() => {}} />
        </CardContent>
      </Card>
    </div>
  )
}
