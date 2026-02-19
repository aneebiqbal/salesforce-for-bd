import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
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

const registerSchema = z
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

type RegisterForm = z.infer<typeof registerSchema>

export const Register = () => {
  const navigate = useNavigate()
  const { signUp } = useAuthContext()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  })

  const onSubmit = async (data: RegisterForm) => {
    setError(null)
    setSubmitting(true)
    try {
      await signUp(data.email, data.password, data.fullName)
      navigate('/login', { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed'
      if (msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('limit') || msg.toLowerCase().includes('wait')) {
        setError('Too many attempts. Please wait 15 minutes before trying again.')
      } else {
        setError(msg)
      }
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full min-w-0 max-w-sm shrink-0">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>Register for BD Salesforce.</CardDescription>
        </CardHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-w-0 flex-col">
          <CardContent className="min-w-0 space-y-4">
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                placeholder="Jane Doe"
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
          <CardFooter className="flex min-w-0 shrink-0 flex-col gap-2">
            <Button
              type="submit"
              className="min-h-9 w-full min-w-0 shrink-0"
              disabled={submitting}
            >
              {submitting ? 'Creating account…' : 'Create account'}
            </Button>
            <Link to="/login" className="text-center text-sm text-muted-foreground underline">
              Already have an account? Sign in
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
