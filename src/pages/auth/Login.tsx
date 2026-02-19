import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
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

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

export const Login = () => {
  const navigate = useNavigate()
  const { session, loading: authLoading, signIn } = useAuthContext()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (data: LoginForm) => {
    setError(null)
    setSubmitting(true)
    try {
      await signIn(data.email, data.password)
      toast.success('Signed in')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign in failed'
      setError(msg)
      toast.error(msg)
      setSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (session) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Already logged in</CardTitle>
            <CardDescription>You are signed in.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/dashboard" className="text-primary underline">
              Go to dashboard
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full min-w-0 max-w-sm shrink-0">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Enter your credentials to access BD Salesforce.</CardDescription>
        </CardHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-w-0 flex-col">
          <CardContent className="min-w-0 space-y-4">
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
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
                autoComplete="current-password"
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex min-w-0 shrink-0 flex-col gap-2">
            <Button
              type="submit"
              className="min-h-9 w-full min-w-0 shrink-0"
              disabled={submitting}
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
            <Link to="/register" className="text-center text-sm text-muted-foreground underline">
              Create an account
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
