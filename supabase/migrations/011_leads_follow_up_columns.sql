-- =============================================================================
-- 011: Add follow_up_date and last_contacted_at to leads (used by app)
-- Fixes PGRST204: "Could not find the 'follow_up_date' column of 'leads'"
-- =============================================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS follow_up_date date,
  ADD COLUMN IF NOT EXISTS last_contacted_at date;

COMMENT ON COLUMN public.leads.follow_up_date IS 'YYYY-MM-DD — when to follow up next';
COMMENT ON COLUMN public.leads.last_contacted_at IS 'YYYY-MM-DD — last time BD touched this lead';

CREATE INDEX IF NOT EXISTS idx_leads_follow_up_date ON public.leads (follow_up_date) WHERE follow_up_date IS NOT NULL;
