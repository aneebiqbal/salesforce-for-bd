-- =============================================================================
-- 012: Connects are not actions; add Indeed applies
-- - Remove connects_used from total_actions and response_rate
-- - Add indeed_applies column and include it in actions
-- =============================================================================

-- Drop views that depend on total_actions/response_rate (no data loss; views are just queries)
DROP VIEW IF EXISTS public.v_bd_performance;
DROP VIEW IF EXISTS public.v_daily_activity_summary;

-- Add new column for Indeed applies (job board applies outside LinkedIn Easy Apply)
ALTER TABLE public.daily_activities
  ADD COLUMN IF NOT EXISTS indeed_applies int NOT NULL DEFAULT 0;

-- Recreate total_actions: same formula but WITHOUT connects_used, WITH indeed_applies
ALTER TABLE public.daily_activities DROP COLUMN IF EXISTS total_actions;
ALTER TABLE public.daily_activities DROP COLUMN IF EXISTS response_rate;

ALTER TABLE public.daily_activities
  ADD COLUMN total_actions int GENERATED ALWAYS AS (
    COALESCE(proposals_sent, 0) + COALESCE(warmup_messages, 0)
    + COALESCE(invites_received, 0) + COALESCE(interviews, 0)
    + COALESCE(easy_applies, 0) + COALESCE(connection_requests, 0) + COALESCE(direct_applies, 0) + COALESCE(indeed_applies, 0)
    + COALESCE(dms_sent, 0) + COALESCE(fetched_emails, 0) + COALESCE(inmail_sent, 0)
    + COALESCE(emails_sent, 0) + COALESCE(meetings_booked, 0)
  ) STORED;

ALTER TABLE public.daily_activities
  ADD COLUMN response_rate numeric GENERATED ALWAYS AS (
    CASE
      WHEN (COALESCE(proposals_sent, 0) + COALESCE(warmup_messages, 0)
        + COALESCE(invites_received, 0) + COALESCE(interviews, 0)
        + COALESCE(easy_applies, 0) + COALESCE(connection_requests, 0) + COALESCE(direct_applies, 0) + COALESCE(indeed_applies, 0)
        + COALESCE(dms_sent, 0) + COALESCE(fetched_emails, 0) + COALESCE(inmail_sent, 0)
        + COALESCE(emails_sent, 0) + COALESCE(meetings_booked, 0)) > 0
      THEN round((responses_received::numeric / NULLIF(
        COALESCE(proposals_sent, 0) + COALESCE(warmup_messages, 0)
        + COALESCE(invites_received, 0) + COALESCE(interviews, 0)
        + COALESCE(easy_applies, 0) + COALESCE(connection_requests, 0) + COALESCE(direct_applies, 0) + COALESCE(indeed_applies, 0)
        + COALESCE(dms_sent, 0) + COALESCE(fetched_emails, 0) + COALESCE(inmail_sent, 0)
        + COALESCE(emails_sent, 0) + COALESCE(meetings_booked, 0), 0)), 4)
      ELSE 0
    END
  ) STORED;

COMMENT ON COLUMN public.daily_activities.indeed_applies IS 'Indeed (or other job board) full applications — counted as actions';
COMMENT ON COLUMN public.daily_activities.connects_used IS 'Upwork connects used — tracked but NOT counted in total_actions';

-- Recreate views that depend on total_actions/response_rate (same definitions, now using new generated columns)
CREATE OR REPLACE VIEW public.v_daily_activity_summary AS
SELECT
  da.id,
  da.profile_id,
  da.bd_member_id,
  da.platform_id,
  da.activity_date,
  da.responses_received,
  da.leads_created,
  da.notes,
  da.remarks,
  da.execution_completed,
  da.total_actions,
  da.response_rate,
  da.created_at,
  da.updated_at,
  p.name AS profile_name,
  p.status AS profile_status,
  pl.name AS platform_name,
  pl.display_name AS platform_display_name,
  up.full_name AS bd_member_name,
  up.email AS bd_member_email
FROM public.daily_activities da
JOIN public.profiles p ON p.id = da.profile_id
JOIN public.platforms pl ON pl.id = da.platform_id
JOIN public.user_profiles up ON up.id = da.bd_member_id;

ALTER VIEW public.v_daily_activity_summary SET (security_invoker = on);

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
WHERE up.role IN ('admin', 'bd_manager')
GROUP BY up.id, up.full_name, up.email;

ALTER VIEW public.v_bd_performance SET (security_invoker = on);
