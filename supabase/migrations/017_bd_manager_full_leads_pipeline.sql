-- =============================================================================
-- 017: BD manager sees full leads pipeline (all leads) and can assign any lead
-- Simplifies: super_admin = do anything; bd_manager = assign dev/BD + full pipeline
-- =============================================================================

-- Remove team-only lead visibility so bd_manager can see all leads
DROP POLICY IF EXISTS "bd_manager read leads" ON public.leads;
DROP POLICY IF EXISTS "bd_manager update leads team" ON public.leads;

-- BD manager: SELECT and UPDATE all leads (full pipeline, assign anyone)
CREATE POLICY "bd_manager read all leads" ON public.leads
  FOR SELECT USING (public.current_user_role() = 'bd_manager');

CREATE POLICY "bd_manager update all leads" ON public.leads
  FOR UPDATE USING (public.current_user_role() = 'bd_manager');
