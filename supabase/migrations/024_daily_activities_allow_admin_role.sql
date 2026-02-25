-- =============================================================================
-- 024: daily_activities — allow role 'admin' in super_admin policies (fix 42501)
-- If user_profiles.role is still 'admin' (legacy), RLS blocks insert/update.
-- Accept both 'super_admin' and 'admin' so either works without requiring 023.
-- =============================================================================

DROP POLICY IF EXISTS "super_admin select daily_activities" ON public.daily_activities;
DROP POLICY IF EXISTS "super_admin insert daily_activities" ON public.daily_activities;
DROP POLICY IF EXISTS "super_admin update daily_activities" ON public.daily_activities;
DROP POLICY IF EXISTS "super_admin delete daily_activities" ON public.daily_activities;

CREATE POLICY "super_admin select daily_activities" ON public.daily_activities
  FOR SELECT USING (public.current_user_role() IN ('super_admin', 'admin'));

CREATE POLICY "super_admin insert daily_activities" ON public.daily_activities
  FOR INSERT WITH CHECK (public.current_user_role() IN ('super_admin', 'admin'));

CREATE POLICY "super_admin update daily_activities" ON public.daily_activities
  FOR UPDATE USING (public.current_user_role() IN ('super_admin', 'admin'));

CREATE POLICY "super_admin delete daily_activities" ON public.daily_activities
  FOR DELETE USING (public.current_user_role() IN ('super_admin', 'admin'));
