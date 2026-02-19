#!/usr/bin/env node
/**
 * Create 3 BD users (hazimpasha, abdullah, hassan) without email verification.
 *
 * Requires: SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.
 * Get the service_role key: Supabase Dashboard → Project Settings → API → service_role (secret).
 *
 * Run from project root:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/create-users.mjs
 *
 * Or add to .env.local (do NOT commit .env.local with service_role):
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 * Then: node --env-file=.env.local scripts/create-users.mjs
 * (Vite loads .env.local for dev; Node 20+ can use --env-file.)
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  console.error('Missing env. Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.')
  console.error('Get service_role from: Supabase Dashboard → Settings → API → service_role')
  process.exit(1)
}

const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

const USERS = [
  { email: 'hazimpasha@bd.local', fullName: 'Hazim Pasha', password: 'BD-Salesforce-2025!' },
  { email: 'abdullah@bd.local', fullName: 'Abdullah', password: 'BD-Salesforce-2025!' },
  { email: 'hassan@bd.local', fullName: 'Hassan', password: 'BD-Salesforce-2025!' },
]

async function main() {
  console.log('Creating 3 users (no email verification)...\n')
  for (const u of USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.fullName },
    })
    if (error) {
      if (error.message.includes('already been registered')) {
        console.log(`Skip ${u.email} (already exists)`)
      } else {
        console.error(`Failed ${u.email}:`, error.message)
      }
      continue
    }
    console.log(`Created ${u.email} (${u.fullName}) – id: ${data?.user?.id ?? 'n/a'}`)
  }
  console.log('\nDone. Users can sign in with the emails and password above.')
  console.log('They will appear in user_profiles (role: staff) via the auth trigger.')
  console.log('Change their role to bd_manager or admin in the app (Team) or in Supabase if needed.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
