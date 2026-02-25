-- =============================================================================
-- 020: super_admin daily_activities — use current_user_role() for clarity
-- Ensures admin can insert/update daily_activities for any profile (any bd_member_id).
-- Replaces subquery-based policy with function-based for consistency with 015/016.
-- =============================================================================

DROP POLICY IF EXISTS "super_admin full daily_activities" ON public.daily_activities;

CREATE POLICY "super_admin select daily_activities" ON public.daily_activities
  FOR SELECT USING (public.current_user_role() = 'super_admin');

CREATE POLICY "super_admin insert daily_activities" ON public.daily_activities
  FOR INSERT WITH CHECK (public.current_user_role() = 'super_admin');

CREATE POLICY "super_admin update daily_activities" ON public.daily_activities
  FOR UPDATE USING (public.current_user_role() = 'super_admin');

CREATE POLICY "super_admin delete daily_activities" ON public.daily_activities
  FOR DELETE USING (public.current_user_role() = 'super_admin');
