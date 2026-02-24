import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'

const isDev = import.meta.env.DEV

const TEST_USERS = [
  { email: 'admin@bdforce.com', password: 'admin123456', role: 'super_admin' as const, fullName: 'Super Admin' },
  { email: 'aneeb@bdforce.com', password: 'test123456', role: 'bd_manager' as const, fullName: 'Aneeb' },
  { email: 'zaira@bdforce.com', password: 'test123456', role: 'bd_manager' as const, fullName: 'Zaira' },
  { email: 'fizza@bdforce.com', password: 'test123456', role: 'bd_manager' as const, fullName: 'Fizza' },
  { email: 'dev@bdforce.com', password: 'test123456', role: 'developer' as const, fullName: 'Dev User' },
]

export const DevSetupPage = () => {
  const navigate = useNavigate()
  const [log, setLog] = useState<string[]>([])
  const [loading, setLoading] = useState<string | null>(null)

  const append = (msg: string) => {
    setLog((prev) => [...prev, msg])
  }

  const createTestUsers = async () => {
    setLoading('users')
    setLog([])
    try {
      for (let i = 0; i < TEST_USERS.length; i++) {
        const u = TEST_USERS[i]
        append(`Creating ${u.email}...`)
        const { error: signUpError } = await supabase.auth.signUp({
          email: u.email,
          password: u.password,
          options: { data: { full_name: u.fullName } },
        })
        if (signUpError && !signUpError.message.includes('already registered')) {
          throw signUpError
        }
        const { error: rpcError } = await supabase.rpc('set_my_role_for_dev', {
          p_role: u.role,
          p_full_name: u.fullName,
        })
        if (rpcError) throw rpcError
        append(`${u.email} → ${u.role}`)
        await supabase.auth.signOut()
      }
      append('Signing in as admin...')
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: TEST_USERS[0].email,
        password: TEST_USERS[0].password,
      })
      if (signInError) throw signInError
      append('Test users created. Logged in as admin.')
      toast.success('Test users created')
    } catch (e) {
      append(`Error: ${e instanceof Error ? e.message : String(e)}`)
      toast.error('Failed to create test users')
    } finally {
      setLoading(null)
    }
  }

  const seedProfiles = async () => {
    setLoading('profiles')
    setLog((prev) => [...prev, '--- Seeding profiles ---'])
    try {
      const [{ data: platforms }, { data: users }] = await Promise.all([
        supabase.from('platforms').select('id, name').order('name'),
        supabase.from('user_profiles').select('id, email').in('email', TEST_USERS.map((u) => u.email)),
      ])
      if (!platforms?.length || !users?.length) throw new Error('Platforms or users not found. Create test users first.')
      const byEmail = Object.fromEntries(users.map((u) => [u.email, u.id]))
      const plat = (name: string) => platforms.find((p) => p.name === name)?.id
      const uid = (email: string) => byEmail[email]
      const upwork = plat('upwork')
      const linkedin = plat('linkedin')
      const coldEmail = plat('cold_email')
      if (!upwork || !linkedin || !coldEmail) throw new Error('Platforms upwork/linkedin/cold_email not found.')

      const profiles = [
        { name: 'Aneeb - Upwork', platform_id: upwork, bd_member_id: uid('aneeb@bdforce.com'), status: 'active' as const },
        { name: 'Aneeb - LinkedIn', platform_id: linkedin, bd_member_id: uid('aneeb@bdforce.com'), status: 'active' as const },
        { name: 'Zaira - Upwork', platform_id: upwork, bd_member_id: uid('zaira@bdforce.com'), status: 'active' as const },
        { name: 'Fizza - LinkedIn', platform_id: linkedin, bd_member_id: uid('fizza@bdforce.com'), status: 'active' as const },
        { name: 'Fizza - Cold Email', platform_id: coldEmail, bd_member_id: uid('fizza@bdforce.com'), status: 'active' as const },
      ]
      const { error } = await supabase.from('profiles').insert(profiles)
      if (error) throw error
      append(`Inserted ${profiles.length} profiles`)
      toast.success('Profiles seeded')
    } catch (e) {
      append(`Error: ${e instanceof Error ? e.message : String(e)}`)
      toast.error('Failed to seed profiles')
    } finally {
      setLoading(null)
    }
  }

  const seedDailyActivities = async () => {
    setLoading('activities')
    setLog((prev) => [...prev, '--- Seeding daily activities ---'])
    try {
      const { data: profiles } = await supabase.from('profiles').select('id, platform_id, bd_member_id')
      if (!profiles?.length) throw new Error('No profiles. Seed profiles first.')
      const days = 7
      const today = new Date()
      let inserted = 0
      for (let d = 0; d < days; d++) {
        const date = new Date(today)
        date.setDate(date.getDate() - d)
        const dateStr = date.toISOString().slice(0, 10)
        for (const p of profiles) {
          const row = {
            profile_id: p.id,
            bd_member_id: p.bd_member_id,
            platform_id: p.platform_id,
            activity_date: dateStr,
            proposals_sent: Math.floor(Math.random() * 15) + 2,
            connects_used: Math.floor(Math.random() * 20) + 5,
            warmup_messages: Math.floor(Math.random() * 10),
            invites_received: Math.floor(Math.random() * 3),
            interviews: Math.floor(Math.random() * 2),
            easy_applies: Math.floor(Math.random() * 25),
            connection_requests: Math.floor(Math.random() * 20),
            direct_applies: Math.floor(Math.random() * 5),
            indeed_applies: Math.floor(Math.random() * 8),
            dms_sent: Math.floor(Math.random() * 15),
            fetched_emails: Math.floor(Math.random() * 10),
            inmail_sent: Math.floor(Math.random() * 5),
            emails_sent: Math.floor(Math.random() * 50) + 10,
            open_rate: Math.floor(Math.random() * 30) + 10,
            reply_rate: Math.floor(Math.random() * 15) + 2,
            bounced: Math.floor(Math.random() * 3),
            meetings_booked: Math.floor(Math.random() * 2),
            responses_received: Math.floor(Math.random() * 8) + 1,
            leads_created: Math.floor(Math.random() * 3),
            execution_completed: Math.random() > 0.3,
          }
          const { error } = await supabase.from('daily_activities').upsert(row, {
            onConflict: 'profile_id,activity_date',
          })
          if (!error) inserted++
        }
      }
      append(`Upserted ${inserted} activity rows (${days} days × ${profiles.length} profiles)`)
      toast.success('Daily activities seeded')
    } catch (e) {
      append(`Error: ${e instanceof Error ? e.message : String(e)}`)
      toast.error('Failed to seed activities')
    } finally {
      setLoading(null)
    }
  }

  const seedLeads = async () => {
    setLoading('leads')
    setLog((prev) => [...prev, '--- Seeding leads ---'])
    try {
      const [{ data: platforms }, { data: profiles }, { data: users }] = await Promise.all([
        supabase.from('platforms').select('id').limit(1),
        supabase.from('profiles').select('id, bd_member_id').limit(5),
        supabase.from('user_profiles').select('id').in('role', ['super_admin', 'bd_manager']),
      ])
      const platformId = platforms?.[0]?.id
      const profileId = profiles?.[0]?.id
      const assignedTo = users?.[0]?.id
      if (!platformId || !assignedTo) throw new Error('Platforms or users not found.')
      const statuses = ['new', 'contacted', 'proposal', 'interview', 'negotiation', 'won', 'lost'] as const
      const companies = ['Acme Inc', 'TechCorp', 'StartupXYZ', 'GlobalCo', 'NextGen', 'CloudSoft', 'DataDrive', 'AppWorks', 'ScaleUp', 'InnovateLabs']
      const leads = Array.from({ length: 10 }, (_, i) => ({
        client_name: `Client ${i + 1}`,
        email: `client${i + 1}@example.com`,
        company: companies[i % companies.length],
        source_platform_id: platformId,
        source_profile_id: profileId ?? null,
        status: statuses[i % statuses.length],
        assigned_to: assignedTo,
        estimated_value: (i + 1) * 5000,
        notes: i % 2 === 0 ? 'Sample lead' : null,
      }))
      const { error } = await supabase.from('leads').insert(leads)
      if (error) throw error
      append(`Inserted ${leads.length} leads`)
      toast.success('Leads seeded')
    } catch (e) {
      append(`Error: ${e instanceof Error ? e.message : String(e)}`)
      toast.error('Failed to seed leads')
    } finally {
      setLoading(null)
    }
  }

  const seedProjects = async () => {
    setLoading('projects')
    setLog((prev) => [...prev, '--- Seeding projects ---'])
    try {
      const { data: wonLeads } = await supabase.from('leads').select('id, client_name').eq('status', 'won').limit(3)
      const projects = [
        { name: 'Website Redesign', client_name: wonLeads?.[0]?.client_name ?? 'Client A', status: 'active' as const, revenue: 15000, assigned_developers: ['Dev1', 'Dev2'], lead_id: wonLeads?.[0]?.id ?? null },
        { name: 'API Integration', client_name: wonLeads?.[1]?.client_name ?? 'Client B', status: 'completed' as const, revenue: 8000, assigned_developers: ['Dev1'], lead_id: wonLeads?.[1]?.id ?? null },
        { name: 'Mobile App', client_name: wonLeads?.[2]?.client_name ?? 'Client C', status: 'on_hold' as const, revenue: 25000, assigned_developers: [], lead_id: wonLeads?.[2]?.id ?? null },
      ]
      const { error } = await supabase.from('projects').insert(projects)
      if (error) throw error
      append(`Inserted ${projects.length} projects`)
      toast.success('Projects seeded')
    } catch (e) {
      append(`Error: ${e instanceof Error ? e.message : String(e)}`)
      toast.error('Failed to seed projects')
    } finally {
      setLoading(null)
    }
  }

  const seedTargets = async () => {
    setLoading('targets')
    setLog((prev) => [...prev, '--- Seeding targets ---'])
    try {
      const { data: users } = await supabase.from('user_profiles').select('id').in('role', ['bd_manager', 'super_admin'])
      const { data: platforms } = await supabase.from('platforms').select('id').limit(1)
      if (!users?.length) throw new Error('No BD members.')
      const platformId = platforms?.[0]?.id ?? null
      const start = new Date()
      start.setDate(1)
      const startStr = start.toISOString().slice(0, 10)
      const end = new Date(start)
      end.setMonth(end.getMonth() + 1)
      end.setDate(0)
      const endStr = end.toISOString().slice(0, 10)
      const targets = users.flatMap((u) => [
        { bd_member_id: u.id, platform_id: platformId, period: 'monthly' as const, metric: 'proposals_sent', target_value: 100, start_date: startStr, end_date: endStr },
        { bd_member_id: u.id, platform_id: platformId, period: 'monthly' as const, metric: 'leads_created', target_value: 10, start_date: startStr, end_date: endStr },
      ])
      const { error } = await supabase.from('targets').insert(targets)
      if (error) throw error
      append(`Inserted ${targets.length} targets`)
      toast.success('Targets seeded')
    } catch (e) {
      append(`Error: ${e instanceof Error ? e.message : String(e)}`)
      toast.error('Failed to seed targets')
    } finally {
      setLoading(null)
    }
  }

  const seedAll = async () => {
    setLog([])
    await createTestUsers()
    await seedProfiles()
    await seedDailyActivities()
    await seedLeads()
    await seedProjects()
    await seedTargets()
    setLog((prev) => [...prev, '', '✅ Seeding complete.'])
    toast.success('All seed data created')
  }

  if (!isDev) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Not available</CardTitle>
            <CardContent className="pt-2">
              <p className="text-sm text-muted-foreground">Dev setup is only available in development.</p>
              <Button className="mt-4" variant="outline" onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
            </CardContent>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dev Setup</h1>
        <p className="text-muted-foreground">Seed test data (development only). Run in order: Users → Profiles → Rest.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Test users</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={createTestUsers} disabled={!!loading} size="sm">
              {loading === 'users' ? 'Creating…' : 'Create test users'}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Profiles</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={seedProfiles} disabled={!!loading} size="sm">
              {loading === 'profiles' ? 'Seeding…' : 'Seed profiles'}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Daily activities</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={seedDailyActivities} disabled={!!loading} size="sm">
              {loading === 'activities' ? 'Seeding…' : 'Seed activities'}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">4. Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={seedLeads} disabled={!!loading} size="sm">
              {loading === 'leads' ? 'Seeding…' : 'Seed leads'}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">5. Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={seedProjects} disabled={!!loading} size="sm">
              {loading === 'projects' ? 'Seeding…' : 'Seed projects'}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">6. Targets</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={seedTargets} disabled={!!loading} size="sm">
              {loading === 'targets' ? 'Seeding…' : 'Seed targets'}
            </Button>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Run all</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={seedAll} disabled={!!loading}>
            {loading ? 'Running…' : 'Seed everything'}
          </Button>
        </CardContent>
      </Card>
      {log.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-64 overflow-auto rounded bg-muted p-3 text-xs font-mono">
              {log.join('\n')}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
