import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LEAD_STATUSES } from '@/lib/constants'
import type { LeadStatus } from '@/types'
import type { Platform } from '@/types'

const leadSchema = z.object({
  client_name: z.string().min(1, 'Client name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  company: z.string().optional(),
  source_platform_id: z.string().uuid('Select a platform'),
  source_profile_id: z.string().uuid().optional().or(z.literal('')),
  status: z.enum(['new', 'contacted', 'proposal', 'interview', 'negotiation', 'won', 'lost']),
  assigned_to: z.string().uuid().optional().or(z.literal('')),
  estimated_value: z.coerce.number().min(0),
  notes: z.string().optional(),
})

export type LeadFormValues = z.infer<typeof leadSchema>

interface LeadFormProps {
  onSubmit: (values: LeadFormValues) => void | Promise<void>
  platforms: Platform[]
}

export const LeadForm = ({ onSubmit, platforms }: LeadFormProps) => {
  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema) as import('react-hook-form').Resolver<LeadFormValues>,
    defaultValues: { status: 'new', estimated_value: 0 },
  })

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (data: LeadFormValues) => {
        await onSubmit(data)
        form.reset()
      })}
    >
      <div className="space-y-2">
        <Label>Client name</Label>
        <Input placeholder="Client / lead name" {...form.register('client_name')} />
        {form.formState.errors.client_name && (
          <p className="text-xs text-destructive">{form.formState.errors.client_name.message}</p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" placeholder="email@company.com" {...form.register('email')} />
          {form.formState.errors.email && (
            <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Company</Label>
          <Input placeholder="Company (optional)" {...form.register('company')} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Source platform</Label>
          <Select
            value={form.watch('source_platform_id')}
            onValueChange={(v) => form.setValue('source_platform_id', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select platform" />
            </SelectTrigger>
            <SelectContent>
              {platforms.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.source_platform_id && (
            <p className="text-xs text-destructive">{form.formState.errors.source_platform_id.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={form.watch('status')}
            onValueChange={(v) => form.setValue('status', v as LeadStatus)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Source profile ID</Label>
          <Input placeholder="Optional (UUID)" {...form.register('source_profile_id')} />
        </div>
        <div className="space-y-2">
          <Label>Assigned to (user ID)</Label>
          <Input placeholder="Optional (UUID)" {...form.register('assigned_to')} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Estimated value ($)</Label>
        <Input type="number" min={0} {...form.register('estimated_value')} />
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea placeholder="Notes" {...form.register('notes')} />
      </div>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Saving…' : 'Save lead'}
      </Button>
    </form>
  )
}
