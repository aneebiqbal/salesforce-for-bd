-- =============================================================================
-- BD Salesforce - Initial Schema
-- Run this in Supabase SQL Editor (copy-paste ready)
-- =============================================================================

-- Extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- (a) user_profiles - extends auth.users
-- -----------------------------------------------------------------------------
CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'bd_manager', 'staff')),
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- (b) platforms - seed with Upwork, LinkedIn, Cold Email
-- -----------------------------------------------------------------------------
CREATE TABLE public.platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;

INSERT INTO public.platforms (name, display_name) VALUES
  ('upwork', 'Upwork'),
  ('linkedin', 'LinkedIn'),
  ('cold_email', 'Cold Email');

-- -----------------------------------------------------------------------------
-- (c) profiles - BD accounts (e.g. "aneeb-upwork", "fizza-linkedin")
-- -----------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  platform_id uuid NOT NULL REFERENCES public.platforms(id) ON DELETE RESTRICT,
  bd_member_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_profiles_bd_member_id ON public.profiles (bd_member_id);
CREATE INDEX idx_profiles_platform_id ON public.profiles (platform_id);

-- -----------------------------------------------------------------------------
-- (d) daily_activities
-- -----------------------------------------------------------------------------
CREATE TABLE public.daily_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bd_member_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  platform_id uuid NOT NULL REFERENCES public.platforms(id) ON DELETE RESTRICT,
  activity_date date NOT NULL,
  -- Common
  responses_received int NOT NULL DEFAULT 0,
  leads_created int NOT NULL DEFAULT 0,
  notes text,
  remarks text,
  execution_completed boolean NOT NULL DEFAULT false,
  -- Upwork
  proposals_sent int NOT NULL DEFAULT 0,
  connects_used int NOT NULL DEFAULT 0,
  warmup_messages int NOT NULL DEFAULT 0,
  invites_received int NOT NULL DEFAULT 0,
  interviews int NOT NULL DEFAULT 0,
  -- LinkedIn
  easy_applies int NOT NULL DEFAULT 0,
  connection_requests int NOT NULL DEFAULT 0,
  direct_applies int NOT NULL DEFAULT 0,
  dms_sent int NOT NULL DEFAULT 0,
  fetched_emails int NOT NULL DEFAULT 0,
  inmail_sent int NOT NULL DEFAULT 0,
  -- Cold Email
  emails_sent int NOT NULL DEFAULT 0,
  open_rate numeric NOT NULL DEFAULT 0,
  reply_rate numeric NOT NULL DEFAULT 0,
  bounced int NOT NULL DEFAULT 0,
  meetings_booked int NOT NULL DEFAULT 0,
  -- Generated
  total_actions int GENERATED ALWAYS AS (
    COALESCE(proposals_sent, 0) + COALESCE(connects_used, 0) + COALESCE(warmup_messages, 0)
    + COALESCE(invites_received, 0) + COALESCE(interviews, 0)
    + COALESCE(easy_applies, 0) + COALESCE(connection_requests, 0) + COALESCE(direct_applies, 0)
    + COALESCE(dms_sent, 0) + COALESCE(fetched_emails, 0) + COALESCE(inmail_sent, 0)
    + COALESCE(emails_sent, 0) + COALESCE(meetings_booked, 0)
  ) STORED,
  response_rate numeric GENERATED ALWAYS AS (
    CASE
      WHEN (COALESCE(proposals_sent, 0) + COALESCE(connects_used, 0) + COALESCE(warmup_messages, 0)
        + COALESCE(invites_received, 0) + COALESCE(interviews, 0)
        + COALESCE(easy_applies, 0) + COALESCE(connection_requests, 0) + COALESCE(direct_applies, 0)
        + COALESCE(dms_sent, 0) + COALESCE(fetched_emails, 0) + COALESCE(inmail_sent, 0)
        + COALESCE(emails_sent, 0) + COALESCE(meetings_booked, 0)) > 0
      THEN round((responses_received::numeric / NULLIF(
        COALESCE(proposals_sent, 0) + COALESCE(connects_used, 0) + COALESCE(warmup_messages, 0)
        + COALESCE(invites_received, 0) + COALESCE(interviews, 0)
        + COALESCE(easy_applies, 0) + COALESCE(connection_requests, 0) + COALESCE(direct_applies, 0)
        + COALESCE(dms_sent, 0) + COALESCE(fetched_emails, 0) + COALESCE(inmail_sent, 0)
        + COALESCE(emails_sent, 0) + COALESCE(meetings_booked, 0), 0)), 4)
      ELSE 0
    END
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, activity_date)
);

ALTER TABLE public.daily_activities ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_daily_activities_profile_date ON public.daily_activities (profile_id, activity_date);
CREATE INDEX idx_daily_activities_bd_date ON public.daily_activities (bd_member_id, activity_date);

-- -----------------------------------------------------------------------------
-- (e) leads
-- -----------------------------------------------------------------------------
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  email text,
  company text,
  source_platform_id uuid NOT NULL REFERENCES public.platforms(id) ON DELETE RESTRICT,
  source_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'proposal', 'interview', 'negotiation', 'won', 'lost')),
  assigned_to uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  estimated_value numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_leads_status ON public.leads (status);
CREATE INDEX idx_leads_assigned_to ON public.leads (assigned_to);

-- -----------------------------------------------------------------------------
-- (f) targets
-- -----------------------------------------------------------------------------
CREATE TABLE public.targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bd_member_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  platform_id uuid REFERENCES public.platforms(id) ON DELETE SET NULL,
  period text NOT NULL CHECK (period IN ('weekly', 'monthly')),
  metric text NOT NULL,
  target_value int NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.targets ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- (g) projects
-- -----------------------------------------------------------------------------
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  name text NOT NULL,
  client_name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled')),
  revenue numeric NOT NULL DEFAULT 0,
  assigned_developers text[] NOT NULL DEFAULT '{}',
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_daily_activities_updated_at
  BEFORE UPDATE ON public.daily_activities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Auth trigger: create user_profiles on signup
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'staff'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- RLS: helper to get current user's role
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- RLS Policies: user_profiles
-- -----------------------------------------------------------------------------
CREATE POLICY "admin full user_profiles" ON public.user_profiles
  FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "users read own user_profiles" ON public.user_profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "bd_manager update user_profiles" ON public.user_profiles
  FOR UPDATE USING (public.current_user_role() = 'bd_manager');

-- -----------------------------------------------------------------------------
-- RLS Policies: platforms (read-only for all authenticated)
-- -----------------------------------------------------------------------------
CREATE POLICY "authenticated read platforms" ON public.platforms
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin full platforms" ON public.platforms
  FOR ALL USING (public.current_user_role() = 'admin');

-- -----------------------------------------------------------------------------
-- RLS Policies: profiles
-- -----------------------------------------------------------------------------
CREATE POLICY "admin full profiles" ON public.profiles
  FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "bd_manager read profiles" ON public.profiles
  FOR SELECT USING (public.current_user_role() = 'bd_manager');

CREATE POLICY "bd_manager insert own profiles" ON public.profiles
  FOR INSERT WITH CHECK (bd_member_id = auth.uid());

CREATE POLICY "bd_manager update own profiles" ON public.profiles
  FOR UPDATE USING (bd_member_id = auth.uid());

CREATE POLICY "staff read profiles" ON public.profiles
  FOR SELECT USING (public.current_user_role() = 'staff');

-- -----------------------------------------------------------------------------
-- RLS Policies: daily_activities
-- -----------------------------------------------------------------------------
CREATE POLICY "admin full daily_activities" ON public.daily_activities
  FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "bd_manager read daily_activities" ON public.daily_activities
  FOR SELECT USING (public.current_user_role() = 'bd_manager');

CREATE POLICY "bd_manager insert own daily_activities" ON public.daily_activities
  FOR INSERT WITH CHECK (bd_member_id = auth.uid());

CREATE POLICY "bd_manager update own daily_activities" ON public.daily_activities
  FOR UPDATE USING (bd_member_id = auth.uid());

CREATE POLICY "staff read daily_activities" ON public.daily_activities
  FOR SELECT USING (public.current_user_role() = 'staff');

-- -----------------------------------------------------------------------------
-- RLS Policies: leads
-- -----------------------------------------------------------------------------
CREATE POLICY "admin full leads" ON public.leads
  FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "bd_manager read leads" ON public.leads
  FOR SELECT USING (public.current_user_role() = 'bd_manager');

CREATE POLICY "bd_manager update assigned leads" ON public.leads
  FOR UPDATE USING (assigned_to = auth.uid());

CREATE POLICY "bd_manager insert leads" ON public.leads
  FOR INSERT WITH CHECK (public.current_user_role() = 'bd_manager');

CREATE POLICY "staff read leads" ON public.leads
  FOR SELECT USING (public.current_user_role() = 'staff');

-- -----------------------------------------------------------------------------
-- RLS Policies: targets
-- -----------------------------------------------------------------------------
CREATE POLICY "admin full targets" ON public.targets
  FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "bd_manager read targets" ON public.targets
  FOR SELECT USING (public.current_user_role() = 'bd_manager');

CREATE POLICY "bd_manager insert own targets" ON public.targets
  FOR INSERT WITH CHECK (bd_member_id = auth.uid());

CREATE POLICY "bd_manager update own targets" ON public.targets
  FOR UPDATE USING (bd_member_id = auth.uid());

CREATE POLICY "staff read targets" ON public.targets
  FOR SELECT USING (public.current_user_role() = 'staff');

-- -----------------------------------------------------------------------------
-- RLS Policies: projects
-- -----------------------------------------------------------------------------
CREATE POLICY "admin full projects" ON public.projects
  FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "bd_manager read projects" ON public.projects
  FOR SELECT USING (public.current_user_role() = 'bd_manager');

CREATE POLICY "staff read projects" ON public.projects
  FOR SELECT USING (public.current_user_role() = 'staff');

-- -----------------------------------------------------------------------------
-- View: v_daily_activity_summary
-- -----------------------------------------------------------------------------
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

-- Grant read to authenticated (RLS still applies on underlying tables)
ALTER VIEW public.v_daily_activity_summary SET (security_invoker = on);

-- -----------------------------------------------------------------------------
-- View: v_bd_performance
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
WHERE up.role IN ('admin', 'bd_manager')
GROUP BY up.id, up.full_name, up.email;

ALTER VIEW public.v_bd_performance SET (security_invoker = on);
