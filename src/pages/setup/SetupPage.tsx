import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuthContext } from '@/providers/AuthProvider'
import { supabase } from '@/lib/supabase'

const setupSchema = z
  .object({
    fullName: z.string().min(1, 'Name is required'),
    email: z.string().min(1, 'Email is required').email('Invalid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type SetupForm = z.infer<typeof setupSchema>

export const SetupPage = () => {
  const navigate = useNavigate()
  const { signUp } = useAuthContext()
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null)
  const [checkLoading, setCheckLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<SetupForm>({
    resolver: zodResolver(setupSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  })

  useEffect(() => {
    let mounted = true
    void (async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc('is_setup_required')
        if (!mounted) return
        if (rpcError) setSetupRequired(false)
        else setSetupRequired(data === true)
      } finally {
        if (mounted) setCheckLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const onSubmit = async (data: SetupForm) => {
    setError(null)
    setSubmitting(true)
    try {
      await signUp(data.email, data.password, data.fullName)
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        await supabase.rpc('promote_to_admin', { target_user_id: session.user.id })
      }
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed')
      setSubmitting(false)
    }
  }

  if (checkLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (setupRequired === false) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Already set up</CardTitle>
            <CardDescription>An admin account already exists.</CardDescription>
          </CardHeader>
          <CardContent>
            <a href="/login" className="text-primary underline">
              Go to login
            </a>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full min-w-0 max-w-sm shrink-0">
        <CardHeader>
          <CardTitle>One-time setup</CardTitle>
          <CardDescription>Create the first admin account for BD Salesforce.</CardDescription>
        </CardHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                placeholder="Admin name"
                autoComplete="name"
                {...form.register('fullName')}
              />
              {form.formState.errors.fullName && (
                <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@company.com"
                autoComplete="email"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...form.register('confirmPassword')}
              />
              {form.formState.errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create admin account'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
