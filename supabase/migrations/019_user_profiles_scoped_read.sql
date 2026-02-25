-- =============================================================================
-- 019: user_profiles — scoped read (fix data leak)
-- Drop permissive "authenticated read" so BDs and developers cannot read all
-- profiles. Keep: own row for everyone; super_admin sees all; bd_manager sees
-- self + team (manager_id = self).
-- =============================================================================

DROP POLICY IF EXISTS "authenticated read user_profiles" ON public.user_profiles;

-- Super_admin: read all. Bd_manager: read own row + profiles they manage.
CREATE POLICY "user_profiles read for role" ON public.user_profiles
  FOR SELECT
  USING (
    id = auth.uid()
    OR public.current_user_role() = 'super_admin'
    OR (
      public.current_user_role() = 'bd_manager'
      AND (manager_id = auth.uid() OR id = auth.uid())
    )
  );
