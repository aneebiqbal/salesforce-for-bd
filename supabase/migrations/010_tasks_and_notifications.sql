-- =============================================================================
-- 010: tasks table (Goals & Tasks) + notifications table
-- =============================================================================

-- -----------------------------------------------------------------------------
-- (a) tasks - per-BD to-dos (assignable by admin)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bd_member_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  repeat text NOT NULL DEFAULT 'none' CHECK (repeat IN ('none', 'daily', 'weekly', 'monthly')),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_tasks_bd_member_id ON public.tasks (bd_member_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks (due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON public.tasks (completed_at);

DROP TRIGGER IF EXISTS set_tasks_updated_at ON public.tasks;
CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: admin full; BD read/insert/update/delete own
CREATE POLICY "admin full tasks" ON public.tasks
  FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "bd read own tasks" ON public.tasks
  FOR SELECT USING (bd_member_id = auth.uid());

CREATE POLICY "bd insert own tasks" ON public.tasks
  FOR INSERT WITH CHECK (bd_member_id = auth.uid());

CREATE POLICY "bd update own tasks" ON public.tasks
  FOR UPDATE USING (bd_member_id = auth.uid());

CREATE POLICY "bd delete own tasks" ON public.tasks
  FOR DELETE USING (bd_member_id = auth.uid());

-- staff can read (e.g. view assignee)
CREATE POLICY "staff read tasks" ON public.tasks
  FOR SELECT USING (public.current_user_role() = 'staff');

-- -----------------------------------------------------------------------------
-- (b) notifications - for BD when admin assigns something
-- -----------------------------------------------------------------------------
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('task_assigned', 'lead_assigned', 'profile_assigned')),
  title text NOT NULL,
  message text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX idx_notifications_read_at ON public.notifications (read_at);
CREATE INDEX idx_notifications_created_at ON public.notifications (created_at DESC);

-- RLS: users see only their own notifications
CREATE POLICY "users read own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "users insert own notifications" ON public.notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admin can create notifications for any user (e.g. on assign); users can create for self if needed
CREATE POLICY "admin or self insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (public.current_user_role() = 'admin' OR user_id = auth.uid());
