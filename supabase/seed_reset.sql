-- =============================================================================
-- BD Salesforce – Reset data and seed only what’s required to run the platform
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Copy-paste the whole file and click Run.
--
-- What this does:
--   1. Deletes all business data (activities, targets, projects, leads, profiles).
--   2. Re-seeds the 3 required platforms (Upwork, LinkedIn, Cold Email).
--   3. Leaves user_profiles and auth.users unchanged so existing users can
--      still log in (with empty dashboards).
--
-- Optional: To also remove all users (full reset), run the block at the bottom
-- and then delete users in Dashboard → Authentication → Users.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Remove all business data (projects is truncated via CASCADE from leads)
-- -----------------------------------------------------------------------------
TRUNCATE TABLE public.daily_activities, public.targets, public.leads, public.profiles CASCADE;

-- -----------------------------------------------------------------------------
-- 2. Re-seed required platforms (required for dropdowns and app to work)
-- -----------------------------------------------------------------------------
DELETE FROM public.platforms;

INSERT INTO public.platforms (name, display_name) VALUES
  ('upwork', 'Upwork'),
  ('linkedin', 'LinkedIn'),
  ('cold_email', 'Cold Email');

-- Done. Existing users can log in; /setup will show if no user_profiles exist.

-- =============================================================================
-- OPTIONAL: Full reset (remove all user_profiles so first signup becomes admin)
-- Run this block only if you want to wipe users from the app.
-- After running, delete auth users in: Dashboard → Authentication → Users
-- (or they will get a new user_profile on next login with role from trigger).
-- =============================================================================
/*
DELETE FROM public.user_profiles;
-- Then in Supabase Dashboard: Authentication → Users → delete each user.
*/
