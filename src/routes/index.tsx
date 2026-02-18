import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { AdminRoute } from '@/routes/AdminRoute'
import { Login } from '@/pages/auth/Login'
import { Register } from '@/pages/auth/Register'
import { SetupPage } from '@/pages/setup/SetupPage'
import { DashboardRedirect } from '@/pages/dashboard/DashboardRedirect'
import { AdminDashboard } from '@/pages/dashboard/AdminDashboard'
import { BDDashboard } from '@/pages/dashboard/BDDashboard'
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
  { path: '/register', element: <Register /> },
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
          { path: 'admin', element: <AdminRoute><AdminDashboard /></AdminRoute> },
          { path: 'bd', element: <BDDashboard /> },
        ],
      },
      { path: 'activities', element: <DailyActivity /> },
      { path: 'activities/log', element: <ActivityLog /> },
      { path: 'leads', element: <LeadsPipeline /> },
      { path: 'profiles', element: <ProfilesManagement /> },
      { path: 'team', element: <AdminRoute><TeamManagement /></AdminRoute> },
      { path: 'targets', element: <TargetsPage /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
