-- =============================================================================
-- 023: Treat legacy role 'admin' as 'super_admin' in current_user_role()
-- Production may have user_profiles.role = 'admin' (old value). Policies check
-- for 'super_admin', so INSERT/SELECT on daily_activities and profiles fail and
-- logged data disappears on refresh. Map admin -> super_admin so policies pass.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN role = 'admin' THEN 'super_admin' ELSE role END
  FROM public.user_profiles WHERE id = auth.uid() LIMIT 1;
$$;
