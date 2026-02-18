import { Outlet } from 'react-router'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export const AppLayout = () => {
  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-muted/30 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
