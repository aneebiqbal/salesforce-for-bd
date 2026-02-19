import type { ReactNode } from 'react'

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle: string
  footer: ReactNode
}

export function AuthLayout({ children, title, subtitle, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background lg:flex-row">
      {/* Left panel - branding (hidden on small screens, shown lg+) */}
      <div className="hidden lg:flex lg:w-[48%] lg:flex-col lg:justify-between lg:bg-gradient-to-br lg:from-slate-900 lg:via-slate-800 lg:to-slate-900 lg:p-12 lg:text-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div>
          <div className="text-lg font-semibold tracking-tight opacity-95">BD Salesforce</div>
          <p className="mt-1 text-sm font-medium opacity-80">Business development pipeline & activity</p>
        </div>
        <div className="mt-16 space-y-4">
          <blockquote className="border-l-2 border-white/25 pl-6 text-sm leading-relaxed opacity-90">
            Track leads, daily activity, and targets in one place. Built for BD teams that move fast.
          </blockquote>
        </div>
        <div className="mt-auto pt-8 text-xs opacity-70">
          © BD Salesforce. Secure sign-in.
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:px-14">
        <div className="mx-auto w-full max-w-[400px]">
          <h1 className="font-semibold tracking-tight text-2xl text-foreground sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">
            {subtitle}
          </p>
          <div className="mt-8">
            {children}
          </div>
          <div className="mt-8 flex justify-center">
            {footer}
          </div>
        </div>
      </div>
    </div>
  )
}
