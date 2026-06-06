export type UserRole = 'super_admin' | 'bd_manager' | 'bd' | 'developer'

export type ProfileStatus = 'active' | 'inactive'

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'proposal'
  | 'interview'
  | 'negotiation'
  | 'won'
  | 'lost'

export type TargetPeriod = 'weekly' | 'monthly'

export type ProjectStatus = 'active' | 'completed' | 'on_hold' | 'cancelled'

/** Platform slug - matches platforms.name in DB */
export type PlatformSlug = 'upwork' | 'linkedin' | 'cold_email' | 'turing'

/** user_profiles table */
export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  manager_id: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/** For app use (e.g. auth context) - mirrors UserProfile */
export type User = UserProfile

/** platforms table */
export interface Platform {
  id: string
  name: PlatformSlug
  display_name: string
  is_active: boolean
  created_at: string
}

/** profiles table - BD accounts */
export interface Profile {
  id: string
  name: string
  platform_id: string
  bd_member_id: string
  status: ProfileStatus
  notes: string | null
  created_at: string
  updated_at: string
}

/** Profile with joined platform (from select) */
export interface ProfileWithPlatform extends Profile {
  platform?: Platform | null
}

/** daily_activities table - common + Upwork + LinkedIn + Cold Email */
export interface DailyActivity {
  id: string
  profile_id: string
  bd_member_id: string
  platform_id: string
  activity_date: string
  responses_received: number
  leads_created: number
  notes: string | null
  remarks: string | null
  execution_completed: boolean
  proposals_sent: number
  connects_used: number
  warmup_messages: number
  invites_received: number
  interviews: number
  easy_applies: number
  connection_requests: number
  direct_applies: number
  indeed_applies: number
  dms_sent: number
  fetched_emails: number
  inmail_sent: number
  emails_sent: number
  open_rate: number
  reply_rate: number
  bounced: number
  meetings_booked: number
  total_actions?: number
  response_rate?: number
  check_in_time: string | null
  check_out_time: string | null
  learning_minutes: number | null
  learning_activity: string | null
  created_at: string
  updated_at: string
  platform?: { name: string; display_name: string } | null
}

/** leads table - source_platform joined for display */
export interface Lead {
  id: string
  client_name: string
  email: string | null
  company: string | null
  source_platform_id: string
  source_profile_id: string | null
  status: LeadStatus
  assigned_to: string | null
  estimated_value: number
  notes: string | null
  follow_up_date: string | null   // YYYY-MM-DD — when to follow up next
  last_contacted_at: string | null // YYYY-MM-DD — last time BD touched this lead
  created_at: string
  updated_at: string
  source_platform?: { display_name: string } | null
}

/** targets table - current_value is computed in app or from view */
export interface Target {
  id: string
  bd_member_id: string
  platform_id: string | null
  period: TargetPeriod
  metric: string
  target_value: number
  start_date: string
  end_date: string
  created_at: string
}

/** For UI when we show progress */
export interface TargetWithProgress extends Target {
  current_value?: number
}

/** projects table */
export interface Project {
  id: string
  lead_id: string | null
  name: string
  client_name: string
  status: ProjectStatus
  revenue: number
  assigned_developers: string[]
  start_date: string | null
  end_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

/** Dev task board column */
export type DevTaskStatus =
  | 'backlog'
  | 'ready'
  | 'in_progress'
  | 'qa'
  | 'in_review'
  | 'completed'

/** dev_tasks table - tasks assigned by BD manager to developer */
export interface DevTask {
  id: string
  dev_id: string
  assigned_by: string
  project_id: string | null
  title: string
  description: string | null
  due_date: string
  due_time: string | null
  status: DevTaskStatus
  completed_at: string | null
  created_at: string
  updated_at: string
}

/** dev_attendance table - developer check-in/check-out per day */
export interface DevAttendance {
  id: string
  dev_id: string
  attendance_date: string
  check_in_at: string | null
  check_out_at: string | null
  created_at: string
  updated_at: string
}

/** project_developers - many-to-many */
export interface ProjectDeveloper {
  project_id: string
  developer_id: string
  created_at: string
}

/** notifications table - when admin assigns task/lead/profile to BD */
export type NotificationType = 'task_assigned' | 'lead_assigned' | 'profile_assigned' | 'dev_task_assigned'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string | null
  link: string | null
  read_at: string | null
  created_at: string
}
