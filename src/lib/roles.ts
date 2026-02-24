import type { User } from '@/types'

/**
 * Role helpers — single place for role checks. Keeps UI and hooks simple.
 * Model: Super Admin = do anything, assign anyone. BD Manager = assign dev/BD, full leads pipeline, team. BD/Dev = complete assigned work.
 */
/** Super admin: do anything, assign to anyone */
export function isSuperAdmin(user: User | null | undefined): boolean {
  return user?.role === 'super_admin'
}

/** BD manager: assign to dev/BD, see full pipeline and team */
export function isBdManager(user: User | null | undefined): boolean {
  return user?.role === 'bd_manager'
}

/** Manager or super admin: access Team, Settings, assign leads/tasks, log any profile, etc. */
export function isManagerOrSuperAdmin(user: User | null | undefined): boolean {
  return isSuperAdmin(user) || isBdManager(user)
}

export function isBd(user: User | null | undefined): boolean {
  return user?.role === 'bd'
}

export function isDeveloper(user: User | null | undefined): boolean {
  return user?.role === 'developer'
}
