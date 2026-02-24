-- =============================================================================
-- 014: Developer role — BD manager assigns tasks to devs; dev check-in/out; assign dev to manager and project
-- =============================================================================

-- 1. Add 'developer' to role check
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('super_admin', 'bd_manager', 'bd', 'developer'));

-- 2. Helper: IDs of developers the current user can manage (for RLS)
-- super_admin: all developers; bd_manager: developers where manager_id = self; developer: only self
CREATE OR REPLACE FUNCTION public.my_team_dev_ids()
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
    RETURN QUERY SELECT id FROM public.user_profiles WHERE role = 'developer';
    RETURN;
  END IF;
  IF r = 'bd_manager' THEN
    RETURN QUERY SELECT id FROM public.user_profiles WHERE role = 'developer' AND manager_id = auth.uid();
    RETURN;
  END IF;
  IF r = 'developer' THEN
    RETURN QUERY SELECT auth.uid();
    RETURN;
  END IF;
  RETURN;
END;
$$;

-- 3. user_profiles: bd_manager can update developers (assign manager_id to self or change own devs)
CREATE POLICY "bd_manager update devs in team user_profiles" ON public.user_profiles
  FOR UPDATE USING (
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'bd_manager'
  AND user_profiles.role = 'developer'
  AND (user_profiles.manager_id IS NULL OR user_profiles.manager_id = auth.uid() OR user_profiles.id = auth.uid())
);

-- 4. dev_tasks — assigned by bd_manager to developer; due_date = must complete by
CREATE TABLE public.dev_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dev_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  due_date date NOT NULL,
  due_time time, -- optional time of day
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dev_tasks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_dev_tasks_dev_id ON public.dev_tasks (dev_id);
CREATE INDEX IF NOT EXISTS idx_dev_tasks_assigned_by ON public.dev_tasks (assigned_by);
CREATE INDEX IF NOT EXISTS idx_dev_tasks_project_id ON public.dev_tasks (project_id);
CREATE INDEX IF NOT EXISTS idx_dev_tasks_due_date ON public.dev_tasks (due_date);

DROP TRIGGER IF EXISTS set_dev_tasks_updated_at ON public.dev_tasks;
CREATE TRIGGER set_dev_tasks_updated_at
  BEFORE UPDATE ON public.dev_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS dev_tasks: super_admin full; bd_manager CRUD for tasks where dev_id in my_team_dev_ids(); developer read/update own (complete)
CREATE POLICY "super_admin full dev_tasks" ON public.dev_tasks
  FOR ALL USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY "bd_manager read dev_tasks team" ON public.dev_tasks
  FOR SELECT USING (dev_id IN (SELECT my_team_dev_ids()));

CREATE POLICY "bd_manager insert dev_tasks" ON public.dev_tasks
  FOR INSERT WITH CHECK (
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'bd_manager'
  AND dev_id IN (SELECT my_team_dev_ids())
  AND assigned_by = auth.uid()
);

CREATE POLICY "bd_manager update delete dev_tasks team" ON public.dev_tasks
  FOR ALL USING (
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'bd_manager'
  AND dev_id IN (SELECT my_team_dev_ids())
);

CREATE POLICY "developer read own dev_tasks" ON public.dev_tasks
  FOR SELECT USING (dev_id = auth.uid());

CREATE POLICY "developer update own dev_tasks" ON public.dev_tasks
  FOR UPDATE USING (dev_id = auth.uid());

-- 5. dev_attendance — check-in / check-out per developer per day (one row per dev per date)
CREATE TABLE public.dev_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dev_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  attendance_date date NOT NULL,
  check_in_at timestamptz,
  check_out_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dev_id, attendance_date)
);

ALTER TABLE public.dev_attendance ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_dev_attendance_dev_id ON public.dev_attendance (dev_id);
CREATE INDEX IF NOT EXISTS idx_dev_attendance_date ON public.dev_attendance (attendance_date);

DROP TRIGGER IF EXISTS set_dev_attendance_updated_at ON public.dev_attendance;
CREATE TRIGGER set_dev_attendance_updated_at
  BEFORE UPDATE ON public.dev_attendance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS dev_attendance: super_admin full; bd_manager read team devs; developer read/insert/update own
CREATE POLICY "super_admin full dev_attendance" ON public.dev_attendance
  FOR ALL USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY "bd_manager read dev_attendance team" ON public.dev_attendance
  FOR SELECT USING (dev_id IN (SELECT my_team_dev_ids()));

CREATE POLICY "developer own dev_attendance" ON public.dev_attendance
  FOR ALL USING (dev_id = auth.uid());

-- 6. project_developers — assign developers to projects (replaces/in addition to assigned_developers text[])
CREATE TABLE public.project_developers (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  developer_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, developer_id)
);

ALTER TABLE public.project_developers ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_project_developers_developer_id ON public.project_developers (developer_id);

-- RLS project_developers: super_admin full; bd_manager read/insert/delete for projects they can access; developer read own assignments
CREATE POLICY "super_admin full project_developers" ON public.project_developers
  FOR ALL USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY "bd_manager read project_developers" ON public.project_developers
  FOR SELECT USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'bd_manager');

CREATE POLICY "bd_manager insert project_developers" ON public.project_developers
  FOR INSERT WITH CHECK ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'bd_manager');

CREATE POLICY "bd_manager delete project_developers" ON public.project_developers
  FOR DELETE USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'bd_manager');

CREATE POLICY "developer read own project_developers" ON public.project_developers
  FOR SELECT USING (developer_id = auth.uid());

-- 7. Notifications: add type for dev task assigned
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('task_assigned', 'lead_assigned', 'profile_assigned', 'dev_task_assigned'));

-- bd_manager can create notifications for their devs (e.g. on dev task assign)
CREATE POLICY "bd_manager insert notifications for devs" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'bd_manager'
  AND user_id IN (SELECT my_team_dev_ids()) AND user_id <> auth.uid()
);

-- 8. projects: developer can read projects they are assigned to
CREATE POLICY "developer read assigned projects" ON public.projects
  FOR SELECT USING (
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'developer'
  AND id IN (SELECT project_id FROM public.project_developers WHERE developer_id = auth.uid())
  );

COMMENT ON TABLE public.dev_tasks IS 'Tasks assigned by BD manager to developers; due_date is the assigned completion time';
COMMENT ON TABLE public.dev_attendance IS 'Developer check-in and check-out per day';
COMMENT ON TABLE public.project_developers IS 'Assign developers to projects (many-to-many)';
