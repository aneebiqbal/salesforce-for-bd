import type { UserRole, LeadStatus, ProfileStatus, ProjectStatus } from '@/types'

export const ROLES: { value: UserRole; label: string }[] = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'bd_manager', label: 'BD Manager' },
  { value: 'bd', label: 'BD' },
]

export const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'interview', label: 'Interview' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
]

export const PROFILE_STATUSES: { value: ProfileStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

export const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const TARGET_METRICS: { value: string; label: string }[] = [
  { value: 'proposals_sent', label: 'Proposals sent' },
  { value: 'connects_used', label: 'Connects used (not actions)' },
  { value: 'easy_applies', label: 'Easy applies (LinkedIn)' },
  { value: 'direct_applies', label: 'Direct applies (full applications)' },
  { value: 'indeed_applies', label: 'Indeed applies' },
  { value: 'emails_sent', label: 'Emails sent' },
  { value: 'leads_created', label: 'Leads created' },
  { value: 'responses_received', label: 'Responses received' },
  { value: 'interviews', label: 'Interviews' },
  { value: 'meetings_booked', label: 'Meetings booked' },
  { value: 'deals_won', label: 'Deals won' },
]

/** Platform slugs - for forms when platform_id is selected from platforms table */
export const PLATFORM_SLUGS = ['upwork', 'linkedin', 'cold_email'] as const
