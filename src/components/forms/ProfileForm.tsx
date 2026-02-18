import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const profileSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  avatar_url: z.union([z.string().url(), z.literal('')]).optional(),
})

export type ProfileFormValues = z.infer<typeof profileSchema>

interface ProfileFormProps {
  onSubmit: (values: ProfileFormValues) => void | Promise<void>
  defaultValues?: Partial<ProfileFormValues>
}

export const ProfileForm = ({ onSubmit, defaultValues }: ProfileFormProps) => {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: '', avatar_url: '', ...defaultValues },
  })

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (data) => {
        await onSubmit(data)
      })}
    >
      <div className="space-y-2">
        <Label>Full name</Label>
        <Input placeholder="Your name" {...form.register('full_name')} />
        {form.formState.errors.full_name && (
          <p className="text-xs text-destructive">{form.formState.errors.full_name.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Avatar URL</Label>
        <Input placeholder="https://..." {...form.register('avatar_url')} />
        {form.formState.errors.avatar_url && (
          <p className="text-xs text-destructive">{form.formState.errors.avatar_url.message}</p>
        )}
      </div>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Saving…' : 'Save profile'}
      </Button>
    </form>
  )
}
