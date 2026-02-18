import { RouterProvider } from 'react-router'
import { AuthProvider } from '@/providers/AuthProvider'
import { QueryProvider } from '@/providers/QueryProvider'
import { Toaster } from '@/components/ui/sonner'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { router } from '@/routes'

const App = () => (
  <ErrorBoundary>
    <AuthProvider>
      <QueryProvider>
        <RouterProvider router={router} />
        <Toaster />
      </QueryProvider>
    </AuthProvider>
  </ErrorBoundary>
)

export default App
