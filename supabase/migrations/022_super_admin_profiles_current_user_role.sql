-- =============================================================================
-- 022: profiles — super_admin use current_user_role() (fix super_admin seeing 0)
-- Same pattern as 020 for daily_activities. Avoids subquery that can fail when
-- user_profiles is read under RLS; current_user_role() is SECURITY DEFINER.
-- =============================================================================

DROP POLICY IF EXISTS "super_admin full profiles" ON public.profiles;

CREATE POLICY "super_admin select profiles" ON public.profiles
  FOR SELECT USING (public.current_user_role() = 'super_admin');

CREATE POLICY "super_admin insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (public.current_user_role() = 'super_admin');

CREATE POLICY "super_admin update profiles" ON public.profiles
  FOR UPDATE USING (public.current_user_role() = 'super_admin');

CREATE POLICY "super_admin delete profiles" ON public.profiles
  FOR DELETE USING (public.current_user_role() = 'super_admin');
