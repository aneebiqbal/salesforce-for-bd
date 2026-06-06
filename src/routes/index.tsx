import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { SuperAdminRoute } from '@/routes/SuperAdminRoute'
import { ManagerRoute } from '@/routes/ManagerRoute'
import { DevTasksRoute } from '@/routes/DevTasksRoute'
import { BDRoute } from '@/routes/BDRoute'
import { Login } from '@/pages/auth/Login'
import { SetupPage } from '@/pages/setup/SetupPage'
import { DashboardRedirect } from '@/pages/dashboard/DashboardRedirect'
import { AdminDashboard } from '@/pages/dashboard/AdminDashboard'
import { BDDashboard } from '@/pages/dashboard/BDDashboard'
import { DevDashboard } from '@/pages/dashboard/DevDashboard'
import { DevTasksPage } from '@/pages/dev/DevTasksPage'
import { DailyActivity } from '@/pages/activities/DailyActivity'
import { ActivityLog } from '@/pages/activities/ActivityLog'
import { LeadsPipeline } from '@/pages/leads/LeadsPipeline'
import { ProfilesManagement } from '@/pages/profiles/ProfilesManagement'
import { TeamManagement } from '@/pages/team/TeamManagement'
import { TargetsPage } from '@/pages/targets/TargetsPage'
import { ProjectsPage } from '@/pages/projects/ProjectsPage'
import { ReportsPage } from '@/pages/reports/ReportsPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { DevSetupPage } from '@/pages/dev/DevSetupPage'

const protectedLayout = (allowedRoles?: import('@/types').UserRole[]) => (
  <ProtectedRoute allowedRoles={allowedRoles}>
    <AppLayout />
  </ProtectedRoute>
)

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/setup', element: <SetupPage /> },
  { path: '/dev-setup', element: <DevSetupPage /> },
  {
    path: '/',
    element: protectedLayout(),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        path: 'dashboard',
        children: [
          { index: true, element: <DashboardRedirect /> },
          { path: 'admin', element: <SuperAdminRoute><AdminDashboard /></SuperAdminRoute> },
          { path: 'bd', element: <BDDashboard /> },
          { path: 'dev', element: <DevDashboard /> },
        ],
      },
      { path: 'dev/tasks', element: <DevTasksRoute><DevTasksPage /></DevTasksRoute> },
      { path: 'activities', element: <BDRoute><DailyActivity /></BDRoute> },
      { path: 'activities/log', element: <BDRoute><ActivityLog /></BDRoute> },
      { path: 'leads', element: <BDRoute><LeadsPipeline /></BDRoute> },
      { path: 'profiles', element: <BDRoute><ProfilesManagement /></BDRoute> },
      { path: 'team', element: <ManagerRoute><TeamManagement /></ManagerRoute> },
      { path: 'targets', element: <BDRoute><TargetsPage /></BDRoute> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'reports', element: <BDRoute><ReportsPage /></BDRoute> },
      { path: 'settings', element: <ManagerRoute><SettingsPage /></ManagerRoute> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
