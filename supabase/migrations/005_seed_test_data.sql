-- Dev-only: allow the current user to set their own role and full_name (for /dev-setup test user creation).
-- Only use this from the dev-setup page in development; do not expose in production.
CREATE OR REPLACE FUNCTION public.set_my_role_for_dev(p_role text, p_full_name text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_profiles
  SET
    role = p_role::text,
    full_name = COALESCE(NULLIF(trim(p_full_name), ''), full_name),
    updated_at = now()
  WHERE id = auth.uid();
END;
$$;
