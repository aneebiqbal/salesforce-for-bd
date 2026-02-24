-- =============================================================================
-- 016: BD manager can insert/update daily_activities for team members
-- So managers (and super_admin) can log activity on behalf of any profile they see.
-- =============================================================================

-- Use current_user_role() to avoid subqueries on user_profiles in policy
CREATE POLICY "bd_manager insert daily_activities for team" ON public.daily_activities
  FOR INSERT
  WITH CHECK (
    public.current_user_role() = 'bd_manager'
    AND bd_member_id IN (SELECT my_team_bd_ids())
  );

CREATE POLICY "bd_manager update daily_activities for team" ON public.daily_activities
  FOR UPDATE
  USING (
    public.current_user_role() = 'bd_manager'
    AND bd_member_id IN (SELECT my_team_bd_ids())
  );
