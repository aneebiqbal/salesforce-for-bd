-- =============================================================================
-- 007: Auth RPCs + permissive read for user_profiles (bypass RLS where needed)
-- =============================================================================

-- 1. is_setup_required() — returns true if no user_profiles rows exist
CREATE OR REPLACE FUNCTION public.is_setup_required()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT (SELECT COUNT(*) FROM public.user_profiles) = 0;
$$;

-- 2. promote_to_admin(target_user_id) — only when exactly 1 profile and target = current user
CREATE OR REPLACE FUNCTION public.promote_to_admin(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.user_profiles) <> 1 THEN
    RETURN;
  END IF;
  IF target_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN;
  END IF;
  UPDATE public.user_profiles
  SET role = 'admin', updated_at = now()
  WHERE id = target_user_id;
END;
$$;

-- 3. get_my_role() — returns current user's role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 4. Permissive SELECT: all authenticated users can read all user_profiles (for dropdowns, team list, etc.)
DROP POLICY IF EXISTS "users read own user_profiles" ON public.user_profiles;
CREATE POLICY "authenticated read all user_profiles" ON public.user_profiles
  FOR SELECT TO authenticated USING (true);

-- 5. Grant execute on RPCs to anon (for /setup before any user) and authenticated
GRANT EXECUTE ON FUNCTION public.is_setup_required() TO anon;
GRANT EXECUTE ON FUNCTION public.is_setup_required() TO authenticated;
GRANT EXECUTE ON FUNCTION public.promote_to_admin(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.promote_to_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
