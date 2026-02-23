import React, { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { useActivities } from '@/hooks/useActivities'
import { useProfiles } from '@/hooks/useProfiles'
import { usePlatforms } from '@/hooks/usePlatforms'
import { useAssignableMembers } from '@/hooks/useTeam'
import { createNotification } from '@/hooks/useNotifications'
import type { ProfileWithPlatform } from '@/types'
import { Briefcase, Linkedin, Mail, Pencil, Power, PowerOff } from 'lucide-react'
import { cn } from '@/lib/utils'

const FILTER_ALL = '__all__'

export const ProfilesManagement = () => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<ProfileWithPlatform | null>(null)
  const [platformFilter, setPlatformFilter] = useState<string>(FILTER_ALL)
  const [memberFilter, setMemberFilter] = useState<string>(FILTER_ALL)

  const { profiles, isLoading, createProfile, updateProfile } = useProfiles(undefined)
  const { platforms, isLoading: platformsLoading } = usePlatforms()
  const { members: assignableMembers, isLoading: membersLoading } = useAssignableMembers()

  const filteredProfiles = useMemo(() => {
    let list = profiles ?? []
    if (platformFilter !== FILTER_ALL) list = list.filter((p) => p.platform_id === platformFilter)
    if (memberFilter !== FILTER_ALL) list = list.filter((p) => p.bd_member_id === memberFilter)
    return list
  }, [profiles, platformFilter, memberFilter])

  const handleOpenDialog = (profile?: ProfileWithPlatform) => {
    setEditingProfile(profile ?? null)
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingProfile(null)
  }

  const handleSave = async (values: {
    name: string
    platform_id: string
    bd_member_id: string
    status: 'active' | 'inactive'
    notes: string
  }) => {
    // Duplicate validation: same name + platform + bd_member (excluding self when editing)
    const duplicate = (profiles ?? []).find(
      (p) =>
        p.name.trim().toLowerCase() === values.name.trim().toLowerCase() &&
        p.platform_id === values.platform_id &&
        p.bd_member_id === values.bd_member_id &&
        p.id !== editingProfile?.id
    )
    if (duplicate) {
      toast.error('A profile with this name, platform, and BD member already exists.')
      return
    }
    const assigneeId = values.bd_member_id
    const previousAssignee = editingProfile?.bd_member_id
    try {
      if (editingProfile) {
        await updateProfile({
          id: editingProfile.id,
          payload: { name: values.name, platform_id: values.platform_id, bd_member_id: assigneeId, status: values.status, notes: values.notes || null },
        })
        if (isAdmin && assigneeId && assigneeId !== previousAssignee && assigneeId !== user?.id) {
          await createNotification({
            user_id: assigneeId,
            type: 'profile_assigned',
            title: 'Account assigned to you',
            message: values.name,
            link: '/profiles',
          })
        }
        toast.success('Profile updated')
      } else {
        await createProfile({
          name: values.name,
          platform_id: values.platform_id,
          bd_member_id: assigneeId,
          status: values.status,
          notes: values.notes || null,
        })
        if (isAdmin && assigneeId && assigneeId !== user?.id) {
          await createNotification({
            user_id: assigneeId,
            type: 'profile_assigned',
            title: 'Account assigned to you',
            message: values.name,
            link: '/profiles',
          })
        }
        toast.success('Profile created')
      }
      handleCloseDialog()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save profile')
    }
  }

  const handleToggleStatus = async (profile: ProfileWithPlatform) => {
    const next = profile.status === 'active' ? 'inactive' : 'active'
    if (next === 'inactive') {
      const activityCount = activityCountByProfile.get(profile.id) ?? 0
      const activityNote = activityCount > 0
        ? ` This profile has ${activityCount} day${activityCount !== 1 ? 's' : ''} of activity data.`
        : ''
      const confirmed = window.confirm(
        `Deactivate "${profile.name}"?${activityNote} It will no longer appear in the daily activity list for its BD member.`
      )
      if (!confirmed) return
    }
    try {
      await updateProfile({ id: profile.id, payload: { status: next } })
      toast.success(next === 'active' ? 'Profile activated' : 'Profile deactivated')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update')
    }
  }

  // Fetch all activities to compute per-profile activity counts
  const { activities: allActivities } = useActivities()
  const activityCountByProfile = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const a of allActivities ?? []) {
      map.set(a.profile_id, (map.get(a.profile_id) ?? 0) + 1)
    }
    return map
  }, [allActivities])

  const loading = isLoading || platformsLoading || membersLoading

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Profiles</h1>
          <p className="text-muted-foreground">Manage platform profiles. Assign to BD members.</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>Add Profile</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingProfile ? 'Edit Profile' : 'Add Profile'}</DialogTitle>
              </DialogHeader>
              <ProfileForm
                profile={editingProfile}
                platforms={platforms}
                assignableMembers={assignableMembers}
                onSave={handleSave}
                onCancel={handleCloseDialog}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label htmlFor="filter-platform" className="text-sm text-muted-foreground whitespace-nowrap">Platform</Label>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger id="filter-platform" className="w-[140px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>All</SelectItem>
              {platforms.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="filter-member" className="text-sm text-muted-foreground whitespace-nowrap">BD Member</Label>
          <Select value={memberFilter} onValueChange={setMemberFilter}>
            <SelectTrigger id="filter-member" className="w-[160px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>All</SelectItem>
              {assignableMembers.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : filteredProfiles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {profiles?.length === 0 ? 'No profiles yet. Add profiles to start tracking activity.' : 'No profiles match the current filters.'}
            </p>
            {isAdmin && profiles?.length === 0 && (
              <Button className="mt-3" onClick={() => handleOpenDialog()}>Add Profile</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProfiles.map((profile) => {
            const assignedName = assignableMembers.find((m) => m.id === profile.bd_member_id)?.full_name ?? '—'
            return (
              <Card key={profile.id} className="flex flex-col">
                <CardContent className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium leading-tight">{profile.name}</span>
                    {profile.platform && (
                      <PlatformBadge name={profile.platform.name} displayName={profile.platform.display_name} />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">Assigned to {assignedName}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={profile.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                      {profile.status}
                    </Badge>
                  </div>
                  {profile.notes && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{profile.notes}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {activityCountByProfile.get(profile.id) ?? 0} day{(activityCountByProfile.get(profile.id) ?? 0) !== 1 ? 's' : ''} of activity logged
                  </p>
                  {isAdmin && (
                    <div className="mt-auto flex items-center gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenDialog(profile)}>
                        <Pencil className="size-3.5 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(profile)}
                        title={profile.status === 'active' ? 'Deactivate' : 'Activate'}
                      >
                        {profile.status === 'active' ? <PowerOff className="size-3.5" /> : <Power className="size-3.5" />}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PlatformBadge({ name, displayName }: { name: string; displayName: string }) {
  const icon = name === 'upwork' ? Briefcase : name === 'linkedin' ? Linkedin : Mail
  const Icon = icon
  const color =
    name === 'upwork' ? 'bg-green-500/20 text-green-700 dark:text-green-400'
    : name === 'linkedin' ? 'bg-blue-500/20 text-blue-700 dark:text-blue-400'
    : 'bg-orange-500/20 text-orange-700 dark:text-orange-400'
  return (
    <Badge variant="secondary" className={cn('shrink-0 gap-1', color)}>
      <Icon className="size-3.5" />
      {displayName}
    </Badge>
  )
}

interface ProfileFormProps {
  profile: ProfileWithPlatform | null
  platforms: { id: string; name: string; display_name: string }[]
  assignableMembers: { id: string; full_name: string }[]
  onSave: (values: { name: string; platform_id: string; bd_member_id: string; status: 'active' | 'inactive'; notes: string }) => Promise<void>
  onCancel: () => void
}

function ProfileForm({ profile, platforms, assignableMembers, onSave, onCancel }: ProfileFormProps) {
  const [name, setName] = useState(profile?.name ?? '')
  const [platformId, setPlatformId] = useState(profile?.platform_id ?? '')
  const [bdMemberId, setBdMemberId] = useState(profile?.bd_member_id ?? '')
  const [status, setStatus] = useState<'active' | 'inactive'>(profile?.status ?? 'active')
  const [notes, setNotes] = useState(profile?.notes ?? '')
  const [saving, setSaving] = useState(false)

  React.useEffect(() => {
    setName(profile?.name ?? '')
    setPlatformId(profile?.platform_id ?? '')
    setBdMemberId(profile?.bd_member_id ?? '')
    setStatus(profile?.status ?? 'active')
    setNotes(profile?.notes ?? '')
  }, [profile?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !platformId || !bdMemberId) return
    setSaving(true)
    try {
      await onSave({ name: name.trim(), platform_id: platformId, bd_member_id: bdMemberId, status, notes })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="profile-name">Profile Name</Label>
        <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aneeb - Upwork" required />
      </div>
      <div className="space-y-2">
        <Label>Platform</Label>
        <Select value={platformId || undefined} onValueChange={setPlatformId} required>
          <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
          <SelectContent>
            {platforms.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Assigned BD Member</Label>
        <Select value={bdMemberId || undefined} onValueChange={setBdMemberId} required>
          <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
          <SelectContent>
            {assignableMembers.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={status === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatus('active')}
          >
            Active
          </Button>
          <Button
            type="button"
            variant={status === 'inactive' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatus('inactive')}
          >
            Inactive
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="profile-notes">Notes (optional)</Label>
        <Textarea id="profile-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" rows={2} className="resize-none" />
      </div>
      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </DialogFooter>
    </form>
  )
}
