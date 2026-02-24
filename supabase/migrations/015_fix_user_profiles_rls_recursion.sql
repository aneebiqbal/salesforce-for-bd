-- =============================================================================
-- 015: Fix infinite recursion in user_profiles RLS (42P17)
-- The policy "super_admin full user_profiles" (FOR ALL) uses a subquery that
-- reads from user_profiles, causing infinite recursion on any access.
-- Fix: Drop FOR ALL policy and use current_user_role() for write-only policies.
-- SELECT stays allowed by "authenticated read" (true), so current_user_role()
-- can read the row without triggering the recursive policy.
-- =============================================================================

-- 1. Ensure helper exists (uses SELECT; only non-recursive SELECT policies apply)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. Drop all policies that use the recursive subquery
DROP POLICY IF EXISTS "super_admin full user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "super_admin update user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "bd_manager update own team user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "bd_manager update devs in team user_profiles" ON public.user_profiles;

-- 3. Allow reading own row (simple condition, no subquery)
DROP POLICY IF EXISTS "user_profiles read own row" ON public.user_profiles;
CREATE POLICY "user_profiles read own row" ON public.user_profiles
  FOR SELECT
  USING (id = auth.uid());

-- 4. Super_admin write access using function (no subquery in policy)
CREATE POLICY "super_admin insert user_profiles" ON public.user_profiles
  FOR INSERT WITH CHECK (public.current_user_role() = 'super_admin');

CREATE POLICY "super_admin update user_profiles" ON public.user_profiles
  FOR UPDATE USING (public.current_user_role() = 'super_admin');

CREATE POLICY "super_admin delete user_profiles" ON public.user_profiles
  FOR DELETE USING (public.current_user_role() = 'super_admin');

-- 5. Recreate bd_manager update policies using function (no subquery)
DROP POLICY IF EXISTS "bd_manager update own team user_profiles" ON public.user_profiles;
CREATE POLICY "bd_manager update own team user_profiles" ON public.user_profiles
  FOR UPDATE USING (
    public.current_user_role() = 'bd_manager'
    AND (manager_id = auth.uid() OR id = auth.uid())
  );

DROP POLICY IF EXISTS "bd_manager update devs in team user_profiles" ON public.user_profiles;
CREATE POLICY "bd_manager update devs in team user_profiles" ON public.user_profiles
  FOR UPDATE USING (
    public.current_user_role() = 'bd_manager'
    AND user_profiles.role = 'developer'
    AND (user_profiles.manager_id IS NULL OR user_profiles.manager_id = auth.uid() OR user_profiles.id = auth.uid())
  );
