-- =============================================================================
-- 009: Full dummy data seed for testing (profiles, activities, leads, targets, projects)
--
-- Prerequisite: Create test users first.
--   1. Open the app and go to /dev-setup
--   2. Click "Create test users" (creates admin@bdforce.com, aneeb, zaira, fizza)
--   3. Then run this migration (Supabase SQL Editor or: supabase db push)
--
-- What this seed adds:
--   - 5 profiles (Aneeb: Upwork+LinkedIn; Zaira: Upwork; Fizza: LinkedIn+Cold Email)
--   - 14 days of daily_activities per profile (Upwork/LinkedIn/Cold Email metrics, check-in/out for today)
--   - 7 leads (new, contacted, proposal, interview, negotiation, won, lost)
--   - 6 targets (monthly proposals_sent, easy_applies, leads_created, etc.)
--   - 2 projects (one linked to won lead, one standalone)
--
-- Safe to run multiple times: profiles/activities are idempotent; leads/targets/projects will duplicate.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.seed_009_dummy_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  plat_upwork_id   uuid;
  plat_linkedin_id uuid;
  plat_cold_id     uuid;
  admin_id         uuid;
  bd1_id           uuid;
  bd2_id           uuid;
  bd3_id           uuid;
  prof_aneeb_up    uuid;
  prof_aneeb_li    uuid;
  prof_zaira_up    uuid;
  prof_fizza_li    uuid;
  prof_fizza_ce    uuid;
  lead1_id         uuid;
  lead2_id         uuid;
  d                date;
  i                int;
BEGIN
  SELECT id INTO plat_upwork_id   FROM public.platforms WHERE name = 'upwork' LIMIT 1;
  SELECT id INTO plat_linkedin_id FROM public.platforms WHERE name = 'linkedin' LIMIT 1;
  SELECT id INTO plat_cold_id     FROM public.platforms WHERE name = 'cold_email' LIMIT 1;

  IF plat_upwork_id IS NULL OR plat_linkedin_id IS NULL OR plat_cold_id IS NULL THEN
    RAISE NOTICE 'Platforms not found. Run 001_initial_schema first.';
    RETURN;
  END IF;

  -- Prefer dev-setup emails; fallback to any admin and any 3 bd_managers
  SELECT id INTO admin_id FROM public.user_profiles WHERE role = 'admin' LIMIT 1;
  IF admin_id IS NULL THEN
    SELECT id INTO admin_id FROM public.user_profiles WHERE email = 'admin@bdforce.com' LIMIT 1;
  END IF;
  IF admin_id IS NULL THEN
    SELECT id INTO admin_id FROM public.user_profiles ORDER BY created_at LIMIT 1;
  END IF;

  SELECT id INTO bd1_id FROM public.user_profiles WHERE role = 'bd_manager' AND email = 'aneeb@bdforce.com' LIMIT 1;
  IF bd1_id IS NULL THEN SELECT id INTO bd1_id FROM (SELECT id FROM public.user_profiles WHERE role = 'bd_manager' ORDER BY created_at LIMIT 1 OFFSET 0) x; END IF;

  SELECT id INTO bd2_id FROM public.user_profiles WHERE role = 'bd_manager' AND email = 'zaira@bdforce.com' LIMIT 1;
  IF bd2_id IS NULL THEN SELECT id INTO bd2_id FROM (SELECT id FROM public.user_profiles WHERE role = 'bd_manager' ORDER BY created_at LIMIT 1 OFFSET 1) x; END IF;

  SELECT id INTO bd3_id FROM public.user_profiles WHERE role = 'bd_manager' AND email = 'fizza@bdforce.com' LIMIT 1;
  IF bd3_id IS NULL THEN SELECT id INTO bd3_id FROM (SELECT id FROM public.user_profiles WHERE role = 'bd_manager' ORDER BY created_at LIMIT 1 OFFSET 2) x; END IF;

  IF bd1_id IS NULL THEN
    RAISE NOTICE 'No BD managers in user_profiles. Create test users via /dev-setup first.';
    RETURN;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 1. Profiles (BD accounts per platform) — skip if already exist
  -- ---------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE bd_member_id = bd1_id AND platform_id = plat_upwork_id) THEN
    INSERT INTO public.profiles (name, platform_id, bd_member_id, status) VALUES ('Aneeb - Upwork',     plat_upwork_id,   bd1_id, 'active');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE bd_member_id = bd1_id AND platform_id = plat_linkedin_id) THEN
    INSERT INTO public.profiles (name, platform_id, bd_member_id, status) VALUES ('Aneeb - LinkedIn',   plat_linkedin_id, bd1_id, 'active');
  END IF;
  IF bd2_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE bd_member_id = bd2_id AND platform_id = plat_upwork_id) THEN
    INSERT INTO public.profiles (name, platform_id, bd_member_id, status) VALUES ('Zaira - Upwork',     plat_upwork_id,   bd2_id, 'active');
  END IF;
  IF bd3_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE bd_member_id = bd3_id AND platform_id = plat_linkedin_id) THEN
    INSERT INTO public.profiles (name, platform_id, bd_member_id, status) VALUES ('Fizza - LinkedIn',   plat_linkedin_id, bd3_id, 'active');
  END IF;
  IF bd3_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE bd_member_id = bd3_id AND platform_id = plat_cold_id) THEN
    INSERT INTO public.profiles (name, platform_id, bd_member_id, status) VALUES ('Fizza - Cold Email', plat_cold_id,      bd3_id, 'active');
  END IF;

  SELECT id INTO prof_aneeb_up FROM public.profiles WHERE bd_member_id = bd1_id AND platform_id = plat_upwork_id   LIMIT 1;
  SELECT id INTO prof_aneeb_li FROM public.profiles WHERE bd_member_id = bd1_id AND platform_id = plat_linkedin_id LIMIT 1;
  SELECT id INTO prof_zaira_up FROM public.profiles WHERE bd_member_id = bd2_id AND platform_id = plat_upwork_id   LIMIT 1;
  SELECT id INTO prof_fizza_li FROM public.profiles WHERE bd_member_id = bd3_id AND platform_id = plat_linkedin_id LIMIT 1;
  SELECT id INTO prof_fizza_ce FROM public.profiles WHERE bd_member_id = bd3_id AND platform_id = plat_cold_id     LIMIT 1;

  -- ---------------------------------------------------------------------------
  -- 2. Daily activities (last 14 days, varied metrics + check-in/out for today)
  -- ---------------------------------------------------------------------------
  FOR i IN 0..13 LOOP
    d := current_date - i;
    IF prof_aneeb_up IS NOT NULL THEN
      INSERT INTO public.daily_activities (
        profile_id, bd_member_id, platform_id, activity_date,
        responses_received, leads_created, execution_completed,
        proposals_sent, connects_used, warmup_messages, invites_received, interviews,
        check_in_time, check_out_time
      ) VALUES (
        prof_aneeb_up, bd1_id, plat_upwork_id, d,
        GREATEST(0, 3 - i), LEAST(2, i), (i < 3),
        5 + (i * 2) % 10, 4 + i % 6, 2, 1, (i % 4),
        CASE WHEN i = 0 THEN (d || ' 09:00:00+00')::timestamptz ELSE NULL END,
        CASE WHEN i = 0 THEN (d || ' 17:30:00+00')::timestamptz ELSE NULL END
      )
      ON CONFLICT (profile_id, activity_date) DO UPDATE SET
        proposals_sent = EXCLUDED.proposals_sent,
        connects_used = EXCLUDED.connects_used,
        responses_received = EXCLUDED.responses_received,
        execution_completed = EXCLUDED.execution_completed,
        check_in_time = COALESCE(daily_activities.check_in_time, EXCLUDED.check_in_time),
        check_out_time = COALESCE(daily_activities.check_out_time, EXCLUDED.check_out_time);
    END IF;
    IF prof_aneeb_li IS NOT NULL THEN
      INSERT INTO public.daily_activities (
        profile_id, bd_member_id, platform_id, activity_date,
        responses_received, leads_created, execution_completed,
        easy_applies, connection_requests, direct_applies, dms_sent, fetched_emails, inmail_sent,
        check_in_time, check_out_time
      ) VALUES (
        prof_aneeb_li, bd1_id, plat_linkedin_id, d,
        2, 1, (i < 5),
        15 + (i * 3) % 20, 10 + i % 8, 5, 8, 3, 1,
        CASE WHEN i = 0 THEN (d || ' 09:00:00+00')::timestamptz ELSE NULL END,
        CASE WHEN i = 0 THEN (d || ' 17:30:00+00')::timestamptz ELSE NULL END
      )
      ON CONFLICT (profile_id, activity_date) DO UPDATE SET
        easy_applies = EXCLUDED.easy_applies,
        connection_requests = EXCLUDED.connection_requests,
        execution_completed = EXCLUDED.execution_completed;
    END IF;
    IF prof_zaira_up IS NOT NULL THEN
      INSERT INTO public.daily_activities (
        profile_id, bd_member_id, platform_id, activity_date,
        responses_received, leads_created, execution_completed,
        proposals_sent, connects_used, warmup_messages, invites_received, interviews
      ) VALUES (
        prof_zaira_up, bd2_id, plat_upwork_id, d,
        1, 0, (i < 7),
        4 + i % 8, 3, 1, 0, (i % 3)
      )
      ON CONFLICT (profile_id, activity_date) DO NOTHING;
    END IF;
    IF prof_fizza_li IS NOT NULL THEN
      INSERT INTO public.daily_activities (
        profile_id, bd_member_id, platform_id, activity_date,
        responses_received, leads_created, execution_completed,
        easy_applies, connection_requests, direct_applies, dms_sent, fetched_emails, inmail_sent
      ) VALUES (
        prof_fizza_li, bd3_id, plat_linkedin_id, d,
        3, 2, (i < 4),
        20 + (i * 2) % 15, 12, 6, 10, 5, 2
      )
      ON CONFLICT (profile_id, activity_date) DO NOTHING;
    END IF;
    IF prof_fizza_ce IS NOT NULL THEN
      INSERT INTO public.daily_activities (
        profile_id, bd_member_id, platform_id, activity_date,
        responses_received, leads_created, execution_completed,
        emails_sent, open_rate, reply_rate, bounced, meetings_booked
      ) VALUES (
        prof_fizza_ce, bd3_id, plat_cold_id, d,
        4, 1, (i < 6),
        50 + (i * 5) % 30, 25 + (i * 2) % 20, 10 + i % 15, 0, (i % 2)
      )
      ON CONFLICT (profile_id, activity_date) DO NOTHING;
    END IF;
  END LOOP;

  -- ---------------------------------------------------------------------------
  -- 3. Leads (all statuses, assigned to BDs)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.leads (client_name, email, company, source_platform_id, source_profile_id, status, assigned_to, estimated_value, notes)
  VALUES
    ('Acme Corp',        'contact@acme.com',    'Acme Corp',        plat_upwork_id,   prof_aneeb_up, 'proposal',   bd1_id, 15000, 'From Upwork proposal'),
    ('TechStart Inc',    'hello@techstart.io', 'TechStart Inc',    plat_linkedin_id, prof_aneeb_li, 'interview',  bd1_id, 25000, NULL),
    ('CloudNine',        'partner@cloud9.com',  'CloudNine',       plat_upwork_id,   prof_aneeb_up, 'won',       bd1_id, 45000, 'Closed deal');
  IF bd2_id IS NOT NULL THEN
    INSERT INTO public.leads (client_name, email, company, source_platform_id, source_profile_id, status, assigned_to, estimated_value, notes)
    VALUES ('Global Solutions', 'info@global.co', 'Global Solutions', plat_upwork_id, prof_zaira_up, 'new', bd2_id, 8000, NULL);
  END IF;
  IF bd3_id IS NOT NULL THEN
    INSERT INTO public.leads (client_name, email, company, source_platform_id, source_profile_id, status, assigned_to, estimated_value, notes)
    VALUES
      ('NextGen Labs', 'sales@nextgen.io',   'NextGen Labs', plat_linkedin_id, prof_fizza_li, 'contacted', bd3_id, 12000, 'LinkedIn outreach'),
      ('DataDrive',    'bd@datadrive.com',   'DataDrive',    plat_cold_id,     prof_fizza_ce, 'negotiation', bd3_id, 30000, 'Cold email campaign'),
      ('ScaleUp',      'team@scaleup.io',    'ScaleUp',      plat_linkedin_id, prof_fizza_li, 'lost', bd3_id, 20000, NULL);
  END IF;

  SELECT id INTO lead1_id FROM public.leads WHERE status = 'won' AND assigned_to = bd1_id LIMIT 1;
  SELECT id INTO lead2_id FROM public.leads WHERE status = 'negotiation' LIMIT 1;

  -- ---------------------------------------------------------------------------
  -- 4. Targets (monthly for BD members)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.targets (bd_member_id, platform_id, period, metric, target_value, start_date, end_date)
  VALUES
    (bd1_id, plat_upwork_id,   'monthly', 'proposals_sent',    80, date_trunc('month', current_date)::date, (date_trunc('month', current_date) + interval '1 month - 1 day')::date),
    (bd1_id, plat_linkedin_id, 'monthly', 'easy_applies',    120, date_trunc('month', current_date)::date, (date_trunc('month', current_date) + interval '1 month - 1 day')::date),
    (bd1_id, NULL,             'monthly', 'leads_created',   10, date_trunc('month', current_date)::date, (date_trunc('month', current_date) + interval '1 month - 1 day')::date);
  IF bd2_id IS NOT NULL THEN
    INSERT INTO public.targets (bd_member_id, platform_id, period, metric, target_value, start_date, end_date)
    VALUES (bd2_id, plat_upwork_id, 'monthly', 'proposals_sent', 60, date_trunc('month', current_date)::date, (date_trunc('month', current_date) + interval '1 month - 1 day')::date);
  END IF;
  IF bd3_id IS NOT NULL THEN
    INSERT INTO public.targets (bd_member_id, platform_id, period, metric, target_value, start_date, end_date)
    VALUES
      (bd3_id, plat_linkedin_id, 'monthly', 'connection_requests', 50, date_trunc('month', current_date)::date, (date_trunc('month', current_date) + interval '1 month - 1 day')::date),
      (bd3_id, plat_cold_id,     'monthly', 'emails_sent',       200, date_trunc('month', current_date)::date, (date_trunc('month', current_date) + interval '1 month - 1 day')::date);
  END IF;

  -- ---------------------------------------------------------------------------
  -- 5. Projects (from won/active leads)
  -- ---------------------------------------------------------------------------
  IF lead1_id IS NOT NULL THEN
    INSERT INTO public.projects (lead_id, name, client_name, status, revenue, assigned_developers, start_date, end_date, notes)
    VALUES (lead1_id, 'CloudNine - Phase 1', 'CloudNine', 'active', 45000, ARRAY['dev1@company.com'], current_date - 30, current_date + 60, 'Won deal project');
  END IF;
  INSERT INTO public.projects (lead_id, name, client_name, status, revenue, assigned_developers, start_date, end_date, notes)
  VALUES (NULL, 'Standalone Project', 'Internal Build', 'completed', 8000, '{}', current_date - 90, current_date - 10, NULL);

  RAISE NOTICE 'Seed complete: profiles, 14 days of activities, leads, targets, projects.';
END
$fn$;

SELECT public.seed_009_dummy_data();

DROP FUNCTION public.seed_009_dummy_data();
