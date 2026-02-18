-- One-time setup: allow the first user to promote themselves to admin.
-- The app /setup page registers via Supabase Auth (which creates a user_profiles row with role 'staff'),
-- then calls this RPC to set role = 'admin' when they are the only user.

CREATE OR REPLACE FUNCTION public.promote_first_user_to_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.user_profiles) <> 1 THEN
    RETURN;
  END IF;
  UPDATE public.user_profiles
  SET role = 'admin'
  WHERE id = auth.uid()
  AND role = 'staff';
END;
$$;
