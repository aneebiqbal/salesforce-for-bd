-- =============================================================================
-- 021: Learning activity — BD/manager can log time spent on learning
-- Admin can see what time was spent on when targets aren't met.
-- =============================================================================

ALTER TABLE public.daily_activities
  ADD COLUMN IF NOT EXISTS learning_minutes integer;

ALTER TABLE public.daily_activities
  ADD COLUMN IF NOT EXISTS learning_activity text;

COMMENT ON COLUMN public.daily_activities.learning_minutes IS 'Minutes spent on other work: platform research, new profiles, research, AI, etc. (optional)';
COMMENT ON COLUMN public.daily_activities.learning_activity IS 'What they did: e.g. new platform search, created profile, research, built AI model (optional)';
