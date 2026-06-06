import { supabase } from '@/lib/supabase'
import type { Lead, Project } from '@/types'
import type { QueryClient } from '@tanstack/react-query'

export const PROJECTS_QUERY_KEY = ['projects']

export async function createProjectFromWonLead(
  lead: Lead,
  queryClient?: QueryClient
): Promise<Project | null> {
  try {
    // Check if a project already exists for this lead (prevent duplicates)
    const { data: existing } = await supabase
      .from('projects')
      .select('id')
      .eq('lead_id', lead.id)
      .maybeSingle()

    if (existing) {
      if (queryClient) queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY })
      return null
    }

    // Auto-create project from won lead
    const { data, error } = await supabase
      .from('projects')
      .insert({
        lead_id: lead.id,
        name: lead.company || lead.client_name,
        client_name: lead.client_name,
        revenue: lead.estimated_value,
        assigned_developers: [],
        status: 'active',
        notes: lead.notes
          ? `Created from won lead. ${lead.notes}`
          : 'Created from won lead.',
        start_date: null,
        end_date: null,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create project from won lead:', error)
      return null
    }

    // Invalidate projects cache so UI updates immediately
    if (queryClient) queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY })

    return data as Project
  } catch (err) {
    console.error('Error creating project from won lead:', err)
    return null
  }
}
