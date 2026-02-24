-- =============================================================================
-- 018: Dev tasks status board — backlog, ready, in_progress, qa, in_review, completed
-- Devs move tickets; managers/admins see the board and ticket movement.
-- =============================================================================

ALTER TABLE public.dev_tasks
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'backlog';

ALTER TABLE public.dev_tasks
  DROP CONSTRAINT IF EXISTS dev_tasks_status_check;

ALTER TABLE public.dev_tasks
  ADD CONSTRAINT dev_tasks_status_check
  CHECK (status IN ('backlog', 'ready', 'in_progress', 'qa', 'in_review', 'completed'));

-- Backfill: existing completed tasks get status completed
UPDATE public.dev_tasks
SET status = 'completed'
WHERE completed_at IS NOT NULL AND (status IS NULL OR status = 'backlog');

-- Index for filtering by dev + status (board columns)
CREATE INDEX IF NOT EXISTS idx_dev_tasks_dev_id_status ON public.dev_tasks (dev_id, status);

COMMENT ON COLUMN public.dev_tasks.status IS 'Board column: backlog | ready | in_progress | qa | in_review | completed';
