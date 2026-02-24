/** @deprecated Use SuperAdminRoute or ManagerRoute */
import { SuperAdminRoute } from '@/routes/SuperAdminRoute'

export const AdminRoute = ({ children }: { children: React.ReactNode }) => (
  <SuperAdminRoute>{children}</SuperAdminRoute>
)
