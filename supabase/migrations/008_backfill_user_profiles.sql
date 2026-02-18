-- =============================================================================
-- 008: Backfill user_profiles for auth.users that don't have a row yet
-- (Fixes 406 when .single() returns 0 rows - e.g. user created before trigger)
-- =============================================================================

INSERT INTO public.user_profiles (id, email, full_name, role)
SELECT
  au.id,
  COALESCE(au.email, ''),
  COALESCE(au.raw_user_meta_data->>'full_name', ''),
  'staff'
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles up WHERE up.id = au.id
)
ON CONFLICT (id) DO NOTHING;
