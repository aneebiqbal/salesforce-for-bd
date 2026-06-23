import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { useTeamMembers, useUpdateMemberRole, useToggleMemberActive, useUpdateMemberManager, TEAM_QUERY_KEY } from '@/hooks/useTeam'
import { useActivities } from '@/hooks/useActivities'
import { useProfiles } from '@/hooks/useProfiles'
import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/types'
import { isSuperAdmin, isBdManager } from '@/lib/roles'
import { cn } from '@/lib/utils'

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export const TeamManagement = () => {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const { members, allMembers, isLoading } = useTeamMembers()
  const { profiles } = useProfiles(undefined)
  const { updateMemberRole, isUpdating } = useUpdateMemberRole()
  const { toggleMemberActive, isToggling } = useToggleMemberActive()
  const { updateMemberManager, isUpdating: isUpdatingManager } = useUpdateMemberManager()
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [changingManagerId, setChangingManagerId] = useState<string | null>(null)
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addPassword, setAddPassword] = useState('')
  const [addRole, setAddRole] = useState<UserRole>('bd')
  const [addUserSaving, setAddUserSaving] = useState(false)

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addName.trim() || !addEmail.trim() || !addPassword.trim()) {
      toast.error('Name, email, and password are required')
      return
    }
    setAddUserSaving(true)
    try {
      // Save admin token before any auth operations
      const { data: { session: adminSession } } = await supabase.auth.getSession()
      const adminToken = adminSession?.access_token
      const baseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '')
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

      // Use raw REST API to create the user WITHOUT changing the Supabase client
      // session.  This prevents the unwanted redirect that happens when
      // supabase.auth.signUp() swaps the client session to the new user
      // (which occurs when auto-confirm is disabled).
      const signUpRes = await fetch(`${baseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: anonKey },
        body: JSON.stringify({
          email: addEmail.trim(),
          password: addPassword,
          data: { full_name: addName.trim() },
        }),
      })
      const signUpBody = await signUpRes.json()
      if (!signUpRes.ok) {
        const msg = signUpBody.error_description || signUpBody.msg || signUpBody.error || `Signup failed (${signUpRes.status})`
        throw new Error(msg)
      }
      const userId: string | undefined = signUpBody.id || signUpBody.user?.id
      if (!userId) throw new Error('User creation returned no ID')

      // Upsert profile using admin's raw JWT (bypasses client session)
      const upsertRes = await fetch(`${baseUrl}/rest/v1/user_profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
          apikey: anonKey,
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          id: userId,
          email: addEmail.trim(),
          full_name: addName.trim(),
          role: addRole,
          is_active: true,
          updated_at: new Date().toISOString(),
        }),
      })
      if (!upsertRes.ok) {
        const body = await upsertRes.text().catch(() => '')
        throw new Error(`Profile upsert failed (${upsertRes.status}): ${body}`)
      }

      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEY })
      toast.success('User created successfully')
      setAddUserOpen(false)
      setAddName('')
      setAddEmail('')
      setAddPassword('')
      setAddRole('bd')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create user'
      toast.error(message)
      console.error('[AddUser]', err)
    } finally {
      setAddUserSaving(false)
    }
  }

  const profileCountByMember = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of profiles ?? []) {
      map.set(p.bd_member_id, (map.get(p.bd_member_id) ?? 0) + 1)
    }
    return map
  }, [profiles])

  const superAdminCount = useMemo(() => members.filter((m) => m.role === 'super_admin').length, [members])
  const _isSuperAdmin = isSuperAdmin(currentUser)
  const _isBdManager = isBdManager(currentUser)
  const managerOptions = useMemo(() => {
    if (_isSuperAdmin) return allMembers.filter((m) => m.role === 'super_admin' || m.role === 'bd_manager')
    if (_isBdManager && currentUser) return [currentUser]
    return []
  }, [_isSuperAdmin, _isBdManager, currentUser, allMembers])

  const { activities: allActivities } = useActivities()
  const lastActiveDateByMember = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of allActivities ?? []) {
      const existing = map.get(a.bd_member_id)
      if (!existing || a.activity_date > existing) {
        map.set(a.bd_member_id, a.activity_date)
      }
    }
    return map
  }, [allActivities])

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const handleRoleChange = async (userId: string, role: UserRole) => {
    const currentMember = members.find((m) => m.id === userId)
    if (currentMember?.role === 'super_admin' && role !== 'super_admin' && superAdminCount <= 1) {
      toast.error('Cannot demote the last super admin. Assign another super admin first.')
      return
    }
    setChangingRoleId(userId)
    try {
      await updateMemberRole({ userId, role })
      toast.success('Role updated')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update role')
    } finally {
      setChangingRoleId(null)
    }
  }

  const handleManagerChange = async (userId: string, managerId: string | null) => {
    setChangingManagerId(userId)
    try {
      await updateMemberManager({ userId, managerId })
      toast.success('Manager updated')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update manager')
    } finally {
      setChangingManagerId(null)
    }
  }

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    setTogglingId(userId)
    try {
      await toggleMemberActive({ userId, isActive })
      toast.success(isActive ? 'Member activated' : 'Member deactivated')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update')
    } finally {
      setTogglingId(null)
    }
  }

  const isSelf = (memberId: string) => currentUser?.id === memberId

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-muted-foreground">BD team members and roles.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-muted-foreground">Manage team members, roles, and access.</p>
        </div>
        {_isSuperAdmin && (
          <Button onClick={() => setAddUserOpen(true)}>Add User</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium">Invite new members</p>
          <p className="text-sm text-muted-foreground">
            Share the registration link: <strong>{appUrl}/register</strong>. After they sign up, assign their role here.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded bg-muted px-2 py-1 text-sm break-all">{appUrl}/register</code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(`${appUrl}/register`)
                toast.success('Link copied to clipboard')
              }}
            >
              Copy link
            </Button>
          </div>
        </CardContent>
      </Card>

      {members.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">No team members yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Share the registration link above so others can join.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => {
            const profileCount = profileCountByMember.get(member.id) ?? 0
            const self = isSelf(member.id)
            return (
              <Card key={member.id} className="flex flex-col">
                <CardContent className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-medium',
                        'bg-primary/10 text-primary'
                      )}
                    >
                      {initials(member.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{member.full_name}</p>
                      <p className="truncate text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {member.role.replace('_', ' ')}
                    </Badge>
                    <Badge variant={member.is_active ? 'default' : 'secondary'}>
                      {member.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Joined {new Date(member.created_at).toLocaleDateString()} · {profileCount} profile{profileCount !== 1 ? 's' : ''} assigned
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last active: {lastActiveDateByMember.get(member.id) ?? 'Never'}
                  </p>
                  <div className="mt-auto flex flex-col gap-2 pt-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground shrink-0">Role</Label>
                      <Select
                        value={member.role}
                        onValueChange={(v) => handleRoleChange(member.id, v as UserRole)}
                        disabled={(isUpdating && changingRoleId === member.id) || (member.role === 'super_admin' && superAdminCount <= 1)}
                      >
                        <SelectTrigger className="h-8 flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {_isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
                          <SelectItem value="bd_manager">BD Manager</SelectItem>
                          <SelectItem value="bd">BD</SelectItem>
                          <SelectItem value="developer">Developer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {(_isSuperAdmin || _isBdManager) && (member.role === 'bd' || member.role === 'developer') && managerOptions.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground shrink-0">Manager</Label>
                        <Select
                          value={member.manager_id ?? '__none__'}
                          onValueChange={(v) => handleManagerChange(member.id, v === '__none__' ? null : v)}
                          disabled={isUpdatingManager && changingManagerId === member.id}
                        >
                          <SelectTrigger className="h-8 flex-1">
                            <SelectValue placeholder="No manager" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">No manager</SelectItem>
                            {managerOptions.map((m) => (
                              <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {!self && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isToggling && togglingId === member.id}
                        onClick={() => handleToggleActive(member.id, !member.is_active)}
                      >
                        {member.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    )}
                    {self && (
                      <p className="text-xs text-muted-foreground">You cannot deactivate yourself.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add User Dialog — Super Admin only */}
      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Full name</Label>
              <Input id="add-name" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Jane Doe" required autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-email">Email</Label>
              <Input id="add-email" type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="jane@company.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-password">Password</Label>
              <Input id="add-password" type="password" value={addPassword} onChange={(e) => setAddPassword(e.target.value)} placeholder="At least 8 characters" required minLength={8} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-role">Role</Label>
              <Select value={addRole} onValueChange={(v) => setAddRole(v as UserRole)}>
                <SelectTrigger id="add-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bd">BD</SelectItem>
                  <SelectItem value="bd_manager">BD Manager</SelectItem>
                  <SelectItem value="developer">Developer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setAddUserOpen(false)} disabled={addUserSaving}>Cancel</Button>
              <Button type="submit" disabled={addUserSaving}>{addUserSaving ? 'Creating…' : 'Create User'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
