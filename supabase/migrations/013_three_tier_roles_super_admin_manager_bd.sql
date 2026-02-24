-- =============================================================================
-- 013: 3-tier role system: super_admin, bd_manager, bd
-- - admin → super_admin, staff → bd. Add manager_id. Update RPCs and all RLS.
-- =============================================================================

-- 1. Add manager_id to user_profiles (BDs assigned to a bd_manager)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_manager_id ON public.user_profiles (manager_id);

-- 2. Drop old role constraint FIRST so we can update role values (old constraint only allows admin, bd_manager, staff)
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- 3. Migrate existing role values
UPDATE public.user_profiles SET role = 'super_admin' WHERE TRIM(role) = 'admin';
UPDATE public.user_profiles SET role = 'bd' WHERE TRIM(role) = 'staff';
UPDATE public.user_profiles SET role = TRIM(role) WHERE role IS NOT NULL;

-- 4. Add new role constraint (include 'developer' so migration order with 014 is safe)
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('super_admin', 'bd_manager', 'bd', 'developer'));

-- 5. Default for new users = bd
ALTER TABLE public.user_profiles ALTER COLUMN role SET DEFAULT 'bd';

-- 6. Update handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'bd'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Replace promote_to_admin with promote_to_super_admin
CREATE OR REPLACE FUNCTION public.promote_to_super_admin(target_user_id uuid)
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
  SET role = 'super_admin', updated_at = now()
  WHERE id = target_user_id;
END;
$$;

-- Keep old RPC name working for setup page (call new one)
DROP FUNCTION IF EXISTS public.promote_to_admin(uuid);
-- Grant on new RPC
GRANT EXECUTE ON FUNCTION public.promote_to_super_admin(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.promote_to_super_admin(uuid) TO authenticated;

-- 8. Helper: IDs of users the current user can "see" (for RLS)
-- super_admin: all; bd_manager: self + users where manager_id = self; bd: only self
CREATE OR REPLACE FUNCTION public.my_team_bd_ids()
RETURNS SETOF uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r text;
BEGIN
  SELECT role INTO r FROM public.user_profiles WHERE id = auth.uid();
  IF r = 'super_admin' THEN
    RETURN QUERY SELECT id FROM public.user_profiles;
    RETURN;
  END IF;
  IF r = 'bd_manager' THEN
    RETURN QUERY SELECT id FROM public.user_profiles WHERE manager_id = auth.uid() OR id = auth.uid();
    RETURN;
  END IF;
  RETURN QUERY SELECT auth.uid();
END;
$$;

-- -----------------------------------------------------------------------------
-- Drop ALL existing RLS policies on user_profiles, profiles, daily_activities,
-- leads, targets, projects, tasks, notifications, platforms
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- user_profiles
-- -----------------------------------------------------------------------------
CREATE POLICY "super_admin full user_profiles" ON public.user_profiles
  FOR ALL USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY "authenticated read user_profiles" ON public.user_profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "super_admin update user_profiles" ON public.user_profiles
  FOR UPDATE USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY "bd_manager update own team user_profiles" ON public.user_profiles
  FOR UPDATE USING (
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'bd_manager'
  AND (manager_id = auth.uid() OR id = auth.uid())
);

-- -----------------------------------------------------------------------------
-- platforms (read all; super_admin full)
-- -----------------------------------------------------------------------------
CREATE POLICY "authenticated read platforms" ON public.platforms
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "super_admin full platforms" ON public.platforms
  FOR ALL USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'super_admin');

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
CREATE POLICY "super_admin full profiles" ON public.profiles
  FOR ALL USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY "bd_manager read profiles" ON public.profiles
  FOR SELECT USING (bd_member_id IN (SELECT my_team_bd_ids()));

CREATE POLICY "bd_manager insert profiles for team" ON public.profiles
  FOR INSERT WITH CHECK (
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'bd_manager'
  AND bd_member_id IN (SELECT my_team_bd_ids()) AND bd_member_id <> auth.uid()
);

CREATE POLICY "bd_manager update profiles for team" ON public.profiles
  FOR UPDATE USING (
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'bd_manager'
  AND bd_member_id IN (SELECT my_team_bd_ids()) AND bd_member_id <> auth.uid()
);

CREATE POLICY "bd read own profiles" ON public.profiles
  FOR SELECT USING (bd_member_id = auth.uid());

-- -----------------------------------------------------------------------------
-- daily_activities
-- -----------------------------------------------------------------------------
CREATE POLICY "super_admin full daily_activities" ON public.daily_activities
  FOR ALL USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY "bd_manager read daily_activities team" ON public.daily_activities
  FOR SELECT USING (bd_member_id IN (SELECT my_team_bd_ids()));

CREATE POLICY "bd read own daily_activities" ON public.daily_activities
  FOR SELECT USING (bd_member_id = auth.uid());
CREATE POLICY "bd insert own daily_activities" ON public.daily_activities
  FOR INSERT WITH CHECK (bd_member_id = auth.uid());
CREATE POLICY "bd update own daily_activities" ON public.daily_activities
  FOR UPDATE USING (bd_member_id = auth.uid());

-- -----------------------------------------------------------------------------
-- leads
-- -----------------------------------------------------------------------------
CREATE POLICY "super_admin full leads" ON public.leads
  FOR ALL USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY "bd_manager read leads" ON public.leads
  FOR SELECT USING (assigned_to IN (SELECT my_team_bd_ids()) OR assigned_to IS NULL);
CREATE POLICY "bd_manager update leads team" ON public.leads
  FOR UPDATE USING (
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'bd_manager'
  AND (assigned_to IN (SELECT my_team_bd_ids()) OR assigned_to IS NULL)
);
CREATE POLICY "bd_manager insert leads" ON public.leads
  FOR INSERT WITH CHECK ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'bd_manager');

CREATE POLICY "bd read own leads" ON public.leads
  FOR SELECT USING (assigned_to = auth.uid());
CREATE POLICY "bd update own leads" ON public.leads
  FOR UPDATE USING (assigned_to = auth.uid());
CREATE POLICY "bd insert leads" ON public.leads
  FOR INSERT WITH CHECK (assigned_to = auth.uid());

-- -----------------------------------------------------------------------------
-- targets
-- -----------------------------------------------------------------------------
CREATE POLICY "super_admin full targets" ON public.targets
  FOR ALL USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY "bd_manager read targets" ON public.targets
  FOR SELECT USING (bd_member_id IN (SELECT my_team_bd_ids()));
CREATE POLICY "bd_manager insert targets for team" ON public.targets
  FOR INSERT WITH CHECK (
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'bd_manager'
  AND bd_member_id IN (SELECT my_team_bd_ids()) AND bd_member_id <> auth.uid()
);
CREATE POLICY "bd_manager update targets for team" ON public.targets
  FOR UPDATE USING (
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'bd_manager'
  AND bd_member_id IN (SELECT my_team_bd_ids()) AND bd_member_id <> auth.uid()
);

CREATE POLICY "bd read own targets" ON public.targets
  FOR SELECT USING (bd_member_id = auth.uid());

-- -----------------------------------------------------------------------------
-- projects
-- -----------------------------------------------------------------------------
CREATE POLICY "super_admin full projects" ON public.projects
  FOR ALL USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY "bd_manager read projects" ON public.projects
  FOR SELECT USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'bd_manager');
CREATE POLICY "bd_manager insert projects" ON public.projects
  FOR INSERT WITH CHECK ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'bd_manager');

CREATE POLICY "bd read projects" ON public.projects
  FOR SELECT USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'bd');

-- -----------------------------------------------------------------------------
-- tasks
-- -----------------------------------------------------------------------------
CREATE POLICY "super_admin full tasks" ON public.tasks
  FOR ALL USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY "bd_manager read tasks team" ON public.tasks
  FOR SELECT USING (bd_member_id IN (SELECT my_team_bd_ids()));
CREATE POLICY "bd_manager insert tasks for team" ON public.tasks
  FOR INSERT WITH CHECK (
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'bd_manager'
  AND bd_member_id IN (SELECT my_team_bd_ids()) AND bd_member_id <> auth.uid()
);
CREATE POLICY "bd_manager update delete tasks team" ON public.tasks
  FOR ALL USING (
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'bd_manager'
  AND bd_member_id IN (SELECT my_team_bd_ids())
);

CREATE POLICY "bd own tasks" ON public.tasks
  FOR ALL USING (bd_member_id = auth.uid());

-- -----------------------------------------------------------------------------
-- notifications
-- -----------------------------------------------------------------------------
CREATE POLICY "users read own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "users update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "users insert own notifications" ON public.notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "super_admin or self insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'super_admin' OR user_id = auth.uid()
);
CREATE POLICY "bd_manager insert notifications for team" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'bd_manager'
  AND user_id IN (SELECT my_team_bd_ids()) AND user_id <> auth.uid()
);

-- -----------------------------------------------------------------------------
-- Update view v_bd_performance to use new role names
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_bd_performance AS
SELECT
  up.id AS bd_member_id,
  up.full_name AS bd_member_name,
  up.email AS bd_member_email,
  COUNT(DISTINCT da.id) AS total_activity_entries,
  COALESCE(SUM(da.responses_received), 0)::int AS total_responses_received,
  COALESCE(SUM(da.leads_created), 0)::int AS total_leads_created,
  COALESCE(SUM(da.proposals_sent), 0)::int AS total_proposals_sent,
  COALESCE(SUM(da.easy_applies), 0)::int AS total_easy_applies,
  COALESCE(SUM(da.emails_sent), 0)::int AS total_emails_sent,
  COALESCE(SUM(da.total_actions), 0)::int AS total_actions,
  CASE
    WHEN SUM(da.total_actions) > 0
    THEN round((SUM(da.responses_received)::numeric / SUM(da.total_actions)), 4)
    ELSE 0
  END AS response_rate
FROM public.user_profiles up
LEFT JOIN public.daily_activities da ON da.bd_member_id = up.id
WHERE up.role IN ('super_admin', 'bd_manager', 'bd')
GROUP BY up.id, up.full_name, up.email;

ALTER VIEW public.v_bd_performance SET (security_invoker = on);
