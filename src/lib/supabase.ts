import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '')
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Supabase] Missing env. Add to .env or .env.local:\n' +
      '  VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co\n' +
      '  VITE_SUPABASE_ANON_KEY=your-anon-public-key\n' +
      'Get them: Project Settings → API → Project URL and anon public key (not service_role).'
  )
}

/**
 * No-op lock: run the callback without using Navigator Lock API.
 * Prevents NavigatorLockAcquireTimeoutError when another tab holds the lock
 * or when the lock times out (e.g. 10s).
 */
const noOpLock = <R>(_name: string, _timeout: number, fn: () => Promise<R>): Promise<R> => fn()

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    lock: noOpLock,
  },
})
