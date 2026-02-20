import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useAuthContext } from '@/providers/AuthProvider'
import { supabase } from '@/lib/supabase'

// ─── schemas ─────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(100),
  avatar_url: z.union([z.string().url('Must be a valid URL'), z.literal('')]).optional(),
})

const passwordSchema = z
  .object({
    new_password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
  })

type ProfileFormValues = z.infer<typeof profileSchema>
type PasswordFormValues = z.infer<typeof passwordSchema>

// ─── sub-sections ─────────────────────────────────────────────────────────────

function ProfileSection() {
  const { user, refreshProfile } = useAuthContext()

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name ?? '',
      avatar_url: user?.avatar_url ?? '',
    },
  })

  const onSubmit = async (data: ProfileFormValues) => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ full_name: data.full_name, avatar_url: data.avatar_url || null })
      .eq('id', user!.id)

    if (error) {
      toast.error('Failed to update profile: ' + error.message)
      return
    }

    await refreshProfile()
    toast.success('Profile updated')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Update your display name and avatar.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center gap-4">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="size-14 rounded-full object-cover ring-2 ring-border"
              />
            ) : (
              <div className="flex size-14 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
                {(user?.full_name ?? 'U')[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-medium">{user?.full_name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge variant="secondary" className="mt-1 text-xs capitalize">{user?.role?.replace('_', ' ')}</Badge>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" placeholder="Your name" {...form.register('full_name')} />
            {form.formState.errors.full_name && (
              <p className="text-xs text-destructive">{form.formState.errors.full_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar_url">Avatar URL</Label>
            <Input id="avatar_url" type="url" placeholder="https://example.com/avatar.jpg" {...form.register('avatar_url')} />
            {form.formState.errors.avatar_url && (
              <p className="text-xs text-destructive">{form.formState.errors.avatar_url.message}</p>
            )}
            <p className="text-xs text-muted-foreground">Leave blank to use the initial avatar.</p>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save profile
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function PasswordSection() {
  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { new_password: '', confirm_password: '' },
  })

  const onSubmit = async (data: PasswordFormValues) => {
    const { error } = await supabase.auth.updateUser({ password: data.new_password })
    if (error) {
      toast.error('Failed to change password: ' + error.message)
      return
    }
    toast.success('Password changed successfully')
    form.reset()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>Choose a strong password with at least 8 characters.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new_password">New password</Label>
            <Input
              id="new_password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              {...form.register('new_password')}
            />
            {form.formState.errors.new_password && (
              <p className="text-xs text-destructive">{form.formState.errors.new_password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirm password</Label>
            <Input
              id="confirm_password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              {...form.register('confirm_password')}
            />
            {form.formState.errors.confirm_password && (
              <p className="text-xs text-destructive">{form.formState.errors.confirm_password.message}</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="outline" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Update password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme()

  const options = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Choose your preferred color theme.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          {options.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={`flex flex-1 flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors hover:bg-muted/50 ${
                theme === value ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <Icon className={`size-5 ${theme === value ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-sm font-medium ${theme === value ? 'text-primary' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export const SettingsPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences.</p>
      </div>

      <ProfileSection />
      <PasswordSection />
      <AppearanceSection />
    </div>
  )
}
