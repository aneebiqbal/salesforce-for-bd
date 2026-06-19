# QA Test Flow Document — BD Salesforce

## 1. Authentication

### 1.1 Login Page (`/login`)
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1.1.1 | Render login form | Navigate to `/login` while unauthenticated | See branded left panel (lg+), email + password fields, "Sign in" button |
| 1.1.2 | Validation — empty fields | Click "Sign in" with blank fields | Zod validation errors shown under each field |
| 1.1.3 | Validation — invalid email | Enter "abc" as email, click Sign in | "Invalid email" error shown |
| 1.1.4 | Successful sign-in | Enter valid credentials, click Sign in | Toast "Signed in"; redirect to `/dashboard` |
| 1.1.5 | Failed sign-in | Enter wrong password | Error banner shown above form; toast error |
| 1.1.6 | Already signed in | Navigate to `/login` while session exists | See "You're already signed in" card with "Go to dashboard" link |
| 1.1.7 | Auth loading state | Hard refresh while session restored | Full-screen spinner shown |

### 1.2 Register Page (`/register`)
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1.2.1 | Render register form | Navigate to `/register` | Full name, email, password, confirm password fields |
| 1.2.2 | Validation — password mismatch | Enter different passwords | "Passwords do not match" error on confirm field |
| 1.2.3 | Validation — short password | Enter < 8 char password | "Password must be at least 8 characters" |
| 1.2.4 | Successful registration | Fill valid info, submit | Redirect to `/login`; user can sign in |
| 1.2.5 | Rate limit error | Submit rapidly multiple times | "Too many attempts. Please wait 15 minutes" message |
| 1.2.6 | Already signed in | Navigate to `/register` while session exists | Redirect to `/dashboard` |

### 1.3 Sign Out
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1.3.1 | Sign out from header dropdown | Click avatar → "Log out" | Session cleared; redirect to `/login`; query cache cleared |

### 1.4 Session Auto-Refresh
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1.4.1 | Session refresh interval | Wait ~50 min (or mock timer) after sign-in | Session refreshed; profile re-fetched silently |

### 1.5 Protected Route — Auth Guard
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1.5.1 | Unauthenticated access to `/dashboard` | Navigate while no session | Redirect to `/login` |
| 1.5.2 | Profile load failure — grace period | Session exists but profile fetch fails | Spinner for 4s, then show retry UI with "Couldn't load your profile" |
| 1.5.3 | Profile retry | Click "Retry" button on profile error | Attempts `refreshProfile()`; shows "Loading…" while retrying |

### 1.6 Role Guards
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1.6.1 | BD tries to access `/team` | BD user navigates to `/team` | Redirected to `/dashboard` |
| 1.6.2 | BD tries to access `/settings` | BD user navigates to `/settings` | Redirected to `/dashboard` |
| 1.6.3 | Developer tries to access `/activities` | Developer navigates to `/activities` | Redirected to `/dashboard` |
| 1.6.4 | BD Manager accesses `/team` | BD Manager navigates to `/team` | Page rendered |
| 1.6.5 | Super Admin accesses `/dashboard/admin` | Super Admin navigates to `/dashboard/admin` | Admin dashboard rendered |
| 1.6.6 | BD accesses `/dashboard/bd` | BD user navigates to `/dashboard/bd` | BD dashboard rendered |
| 1.6.7 | Developer accesses `/dashboard/dev` | Developer navigates to `/dashboard/dev` | Dev dashboard rendered |
| 1.6.8 | Developer accesses `/dev/tasks` | Developer navigates to `/dev/tasks` | Dev tasks board rendered |
| 1.6.9 | BD accesses `/dev/tasks` | BD navigates to `/dev/tasks` | Redirected to `/dashboard` |
| 1.6.10 | Role guard loading state | Page loads while auth not ready | Inline spinner shown (not full page) |

---

## 2. Dashboard

### 2.1 Dashboard Redirect (`/dashboard`)
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 2.1.1 | Super Admin redirect | Navigate to `/dashboard` as super_admin | Redirect to `/dashboard/admin` |
| 2.1.2 | Developer redirect | Navigate to `/dashboard` as developer | Redirect to `/dashboard/dev` |
| 2.1.3 | BD redirect | Navigate to `/dashboard` as bd/bd_manager | Redirect to `/dashboard/bd` |
| 2.1.4 | Loading state | Navigate while auth loading | Inline spinner |

### 2.2 Admin Dashboard (`/dashboard/admin`)
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 2.2.1 | Header + date | Navigate | "Admin Dashboard" title with today's date |
| 2.2.2 | Stats cards | Observe | 4 cards: BD Online Today (X/total), All Profiles Done (X/total), Needs Attention (X), Leads This Month (X) |
| 2.2.3 | Today's Team Status panel | Observe | Expandable rows per BD member with check-in status, profile progress bar, actions/leads/responses counts |
| 2.2.4 | Expand BD member row | Click a row | Show detailed per-profile activity logs below |
| 2.2.5 | Undo check-out | Click "Undo check-out" on a checked-out member | Check-out cleared; toast "Check-out cleared" |
| 2.2.6 | Reset check-in | Click "Reset check-in" on a member | Confirmation dialog; on confirm, check-in/out reset; toast "Check-in reset" |
| 2.2.7 | BD Performance table | Scroll | Table with Proposals, LI Applies, Emails, Total Actions, Leads, Response % per BD member |
| 2.2.8 | Activity Trend chart | Observe | 7-day area chart showing daily total actions |
| 2.2.9 | Lead Pipeline chart | Observe | Bar chart showing lead count by pipeline stage |
| 2.2.10 | Platform & Team Stats | Observe | 4 stat boxes: Active Profiles, BD Members, Total Revenue, Leads This Month |
| 2.2.11 | Recent Activity Log | Observe | Table of latest activity entries across team |
| 2.2.12 | Loading states | Navigate while data fetching | Skeleton loaders for each section |
| 2.2.13 | Empty states | No data | Appropriate "No..." messages per section |
| 2.2.14 | Stats loading via Promise.allSettled | One DB query fails | Other stats still render with values; failed one shows `—` |

### 2.3 BD Dashboard (`/dashboard/bd`)
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 2.3.1 | Greeting + snapshot | Navigate | Greeting with user's first name, "BD snapshot" subtitle |
| 2.3.2 | CTA button | Observe | "Log Today's Activity" or "Review Today's Log" button linking to `/activities` |
| 2.3.3 | Today's status card | Observe | Card showing profile progress; green if all done, amber if partial, default if none |
| 2.3.4 | Progress bar | Observe | Shows % of profiles filled today |
| 2.3.5 | Incomplete work alert | When pending tasks or incomplete activity | "Your priorities" card with task list and activity alert |
| 2.3.6 | Notifications alert | When unread notifications exist | Alert showing unread count with link to check bell |
| 2.3.7 | Account Status Today grid | Observe | Links per profile showing filled/completed status |
| 2.3.8 | Active Targets section | Observe | Target cards with progress bars and current vs target values |
| 2.3.9 | Empty targets state | No active targets | Dashed border card: "No active targets set for you right now" |
| 2.3.10 | Leads chart | Observe | Horizontal bar chart of leads by status |
| 2.3.11 | Tasks list in priorities card | Click task link | Navigates to `/targets` |

### 2.4 Developer Dashboard (`/dashboard/dev`)
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 2.4.1 | Attendance card | Observe | Check-in/out status with timestamps |
| 2.4.2 | Check-in button | Click "Check In" | Attendance recorded with timestamp |
| 2.4.3 | Check-out button | Click "Check Out" | Check-out time recorded |
| 2.4.4 | Tasks overview | Observe | Pending/overdue/due-today task counts with links to `/dev/tasks` |
| 2.4.5 | Assigned projects | Observe | Project list (if any assigned) |

---

## 3. Layout & Navigation

### 3.1 Sidebar
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 3.1.1 | Render nav items | Observe sidebar | Items vary by role; BD sees Dashboard, Log Activity, Activity History, Leads, Accounts, Targets, Projects, Reports |
| 3.1.2 | Super Admin/Manager extra items | Observe as super_admin/manager | Also see Team, Dev Tasks, Settings |
| 3.1.3 | Developer nav | Observe as developer | Only Dashboard, My Tasks, Projects |
| 3.1.4 | Active state | Click nav item | Highlighted active state on current route |
| 3.1.5 | Collapse/expand toggle | Click chevron button | Sidebar width toggles 56-rem ↔ 16-rem; icon and label hide/show |
| 3.1.6 | Badges — dashboard | BD with incomplete work | Badge with count on Dashboard icon |
| 3.1.7 | Badges — activities | BD with today's activity incomplete | "!" badge on Log Activity |
| 3.1.8 | Badges — targets | BD with pending tasks | Badge with count on Targets |
| 3.1.9 | Collapsed badge indicator | Sidebar collapsed with badge | Red dot indicator shown |

### 3.2 Header
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 3.2.1 | Notification bell | Observe | Bell icon with unread count badge |
| 3.2.2 | Avatar dropdown | Click avatar | Shows name, email, role badge; Dashboard, Settings (if manager), Log out links |
| 3.2.3 | Role label in dropdown | Observe | Correct badge: Super Admin / BD Manager / Developer / BD |
| 3.2.4 | Settings link | Click Settings (manager+) | Navigate to `/settings` |
| 3.2.5 | Dashboard link in dropdown | Click Dashboard | Navigate to role-specific dashboard |

### 3.3 AI Coach Panel
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 3.3.1 | Panel open/close | Click AI coach button (if enabled) | Panel slides open with chat interface |
| 3.3.2 | Quick prompts | Open panel | Shows predefined chips: "How am I tracking vs my targets?" etc. |
| 3.3.3 | Send message | Type + Send | Message sent; response streamed (OpenAI) |
| 3.3.4 | Clear chat | Click clear button | Chat history cleared |
| 3.3.5 | Disabled state (no API key) | VITE_OPENAI_API_KEY not set | AI coach not rendered (no button shown) |
| 3.3.6 | Minimize | Click minimize | Panel collapses to small bar |

---

## 4. Daily Activity (`/activities`)

### 4.1 Check-in / Check-out
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 4.1.1 | Check-in button | Click "Check In" | Check-in time recorded; button changes to show checked-in state |
| 4.1.2 | Check-out button | Click "Check Out" | Check-out time recorded; button disabled |
| 4.1.3 | Auto check-out previous sessions | Check in for today | Previous unclosed sessions (before today) auto checked-out at their last updated_at |
| 4.1.4 | Check-in status loading | Hard refresh | Spinner while fetching check-in status |
| 4.1.5 | Already checked-in state | Visit after check-in | Shows time; "Check Out" button available |

### 4.2 Quick-Fill Sheet
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 4.2.1 | Open quick-fill | Click a profile card | Sheet opens with platform-specific metric fields |
| 4.2.2 | Fill numeric fields | Enter values for proposals, connects, etc. | Values displayed; stepper controls for adjustment |
| 4.2.3 | Mark execution complete | Check "Execution completed" | Checkbox ticked |
| 4.2.4 | Save activity | Click "Save" | Data upserted; profile card updates to show filled/complete state |
| 4.2.5 | Pre-filled existing data | Open sheet for already-logged profile | Previous values shown |
| 4.2.6 | Validation — negative values | Enter negative number | Input clamps to 0 |
| 4.2.7 | Leads count pre-fill | Enter proposals/emails/applies | "Leads created" suggested based on platform rules |
| 4.2.8 | Connects helper | Enter comma-separated numbers in connects field | Parses and sums correctly |
| 4.2.9 | Previous day quick copy | Click "Copy from yesterday" | Values from yesterday's entry for same profile pre-filled |
| 4.2.10 | Notes + Remarks | Enter text | Saved with activity |
| 4.2.11 | Learning section | Enter learning minutes + activity description | Saved |
| 4.2.12 | Close sheet | Click X or backdrop | Sheet closes; no unsaved data loss warning |

### 4.3 Profile Cards
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 4.3.1 | Profile list | After loading | Cards showing each profile with platform icon, name, status |
| 4.3.2 | Empty state | No profiles | "No accounts assigned yet" message |
| 4.3.3 | Filled indicator | After logging | Green check if execution complete; clock icon if partial |
| 4.3.4 | Admin view | Super Admin visits | Sees all profiles; can log for any BD member |
| 4.3.5 | Team status (admin) | Super Admin/Manager visits | Additional team status panel shown below |

### 4.4 Date Selector
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 4.4.1 | Change date | Pick past/future date | Activities for that date loaded |
| 4.4.2 | Today default | Navigate | Defaults to today's date |

---

## 5. Activity History (`/activities/log`)

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 5.1 | Table render | Navigate | Paginated table with columns: Date, BD Member, Profile, Platform, Actions, Done |
| 5.2 | Date range filter | Set start + end dates | Table filtered by date range |
| 5.3 | BD member filter (manager+) | Select a BD member | Table filtered by selected member |
| 5.4 | Platform filter | Select a platform | Table filtered by platform |
| 5.5 | Pagination | Click next page | Next page of results loaded |
| 5.6 | Row click | Click a row | Navigates to `/activities` |
| 5.7 | Loading state | Apply filter | Skeleton loading in table |
| 5.8 | Empty state | No results | "No activities found" message |
| 5.9 | Completed count badge | Some rows completed | Shows "X of Y completed" above table |

---

## 6. Leads Pipeline (`/leads`)

### 6.1 Kanban Board
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 6.1.1 | Column render | Navigate | 7 columns: New, Contacted, Proposal, Interview, Negotiating, Won, Lost |
| 6.1.2 | Lead cards in columns | Load data | Cards with client name, company, value, platform, assignee, follow-up date |
| 6.1.3 | Horizontal scroll | Many columns visible | Board scrolls horizontally |
| 6.1.4 | Vertical scroll per column | Many cards in a column | Column scrolls independently (header stays fixed) |
| 6.1.5 | Drag-and-drop | Drag card from "New" to "Contacted" | Card moves; status updated in DB |
| 6.1.6 | "Won" → auto-create project | Drag to "Won" | Project auto-created from lead; toast "Project created" |
| 6.1.7 | Loading state | Navigate while fetching | Skeleton cards shown |

### 6.2 Create Lead
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 6.2.1 | Open create dialog | Click "Add Lead" | Dialog with form fields |
| 6.2.2 | Validation — missing required fields | Submit empty form | Zod errors shown |
| 6.2.3 | Validation — missing source platform | Fill name, submit | "Source platform is required" error |
| 6.2.4 | Successful create | Fill all fields, submit | Lead created; added to "New" column; toast "Lead created" |
| 6.2.5 | Assign to BD member | Select assignee | Lead assigned; notification sent to assignee |

### 6.3 Edit Lead
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 6.3.1 | Open edit | Click on lead card (or edit button) | Dialog pre-filled with existing data |
| 6.3.2 | Update fields | Change status, value, notes | Updated in DB; card updates |
| 6.3.3 | Follow-up date | Set follow_up_date | Date shown on card; overdue highlighted red |

### 6.4 Delete Lead
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 6.4.1 | Delete lead | Click trash icon, confirm | Lead deleted; removed from board; toast |
| 6.4.2 | Permission check | BD (not manager) tries to delete | Only managers/super_admins see delete button (configurable) |

---

## 7. Profiles/Accounts (`/profiles`)

### 7.1 List & Filter
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 7.1.1 | Render profiles | Navigate | Card grid showing all profiles with name, platform, assignee, status |
| 7.1.2 | Filter by platform | Select platform filter | Grid filtered |
| 7.1.3 | Filter by assignee | Select BD member | Grid filtered |
| 7.1.4 | Loading state | Navigate while fetching | Skeleton cards |
| 7.1.5 | Empty state | No profiles | "No profiles found" message |

### 7.2 Create Profile
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 7.2.1 | Open create dialog | Click "Add Account" | Dialog with form (name, platform, assignee, notes) |
| 7.2.2 | Validation — missing name | Submit without name | Error on name field |
| 7.2.3 | Successful create | Fill all fields, submit | Profile created; added to list; toast |
| 7.2.4 | Notification on assignment | Assign to BD member | Notification sent to assignee |

### 7.3 Edit Profile
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 7.3.1 | Open edit | Click edit icon | Dialog pre-filled |
| 7.3.2 | Update fields | Change name, status, notes | Updated in DB |
| 7.3.3 | Change assignee | Select different BD member | Reassigned; notification to new assignee |
| 7.3.4 | Toggle active/inactive | Click power icon (list view) | Status toggled |

---

## 8. Team Management (`/team`)

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 8.1 | Render members | Navigate | Table with avatar, name, email, role badge, status, profiles count, actions |
| 8.2 | Role column scope | Super Admin sees all members; Manager sees self + team; BD sees self |
| 8.3 | Change role (super admin only) | Open dropdown, select new role | Role updated; toast |
| 8.4 | Toggle active/inactive | Click toggle button | Member status flipped; toast |
| 8.5 | Change manager (super admin only) | Open dialog, select manager | Manager_id updated |
| 8.6 | Loading state | Navigate while fetching | Skeleton rows |
| 8.7 | Profile count | Observe | Shows how many profiles are assigned to each member |

---

## 9. Targets (`/targets`)

### 9.1 Target Management
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 9.1.1 | Render targets | Navigate | View showing targets with progress, period, metric |
| 9.1.2 | Create target | Click "Add Target", fill metric/period/value/dates | Target created |
| 9.1.3 | Edit target | Click edit | Dialog pre-filled; update values |
| 9.1.4 | Delete target | Click trash, confirm | Target removed |
| 9.1.5 | Progress calculation | Log activities matching target metric | Progress bar updates with current value |
| 9.1.6 | Admin view | Manager/Super Admin sees all BD member targets; can assign targets to others |
| 9.1.7 | BD view | BD sees only own targets |

### 9.2 Task Management (same page)
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 9.2.1 | Create task | Go to Tasks tab, click "Add Task" | Form with title, priority, due date, repeat |
| 9.2.2 | Complete task | Click checkbox | Task marked complete (strikethrough) |
| 9.2.3 | Incomplete task | Uncheck | Completed_at cleared |
| 9.2.4 | Edit task | Click edit | Edit dialog |
| 9.2.5 | Delete task | Click trash, confirm | Task removed |
| 9.2.6 | Admin assign task | Manager assigns task to BD | Task created for BD; notification sent |

---

## 10. Projects (`/projects`)

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 10.1 | Render projects | Navigate | Card grid with project name, client, status, revenue, developers |
| 10.2 | Create project | Click "Add Project" | Form with name, client, status, revenue, lead link |
| 10.3 | Edit project | Click edit | Dialog pre-filled; update fields |
| 10.4 | Delete project (super admin only) | Click trash, confirm | Project removed |
| 10.5 | Assign developers | In edit dialog, select developers | Many-to-many relationship updated |
| 10.6 | Lead auto-creation | Create from won lead | Project automatically created when lead status → won |
| 10.7 | Empty state | No projects | "No projects yet" message |
| 10.8 | Developer view | Developer sees projects they're assigned to |

---

## 11. Reports (`/reports`)

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 11.1 | KPIs | Navigate | Cards: Total Actions, Leads, Responses, Actions/BD/day |
| 11.2 | Activity trend chart | Observe | Line/area chart over selected date range |
| 11.3 | Lead pipeline chart | Observe | Pie chart of lead distribution |
| 11.4 | Table breakdown | Observe | Table with per-BD data for period |
| 11.5 | Date range selector | Pick quick range or custom | Data refreshes |
| 11.6 | BD member filter (manager+) | Select member | Data filtered |
| 11.7 | Export CSV | Click download | CSV file downloaded with current data |
| 11.8 | Loading states | Apply filters | Skeleton/shimmer while loading |

---

## 12. Settings (`/settings`)

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 12.1 | Profile section | Observe | Pre-filled name, avatar URL; save button |
| 12.2 | Update profile | Change name, submit | Profile updated in DB; toast |
| 12.3 | Change password | Fill new + confirm password, submit | Password updated in Supabase Auth |
| 12.4 | Password validation | Mismatched passwords | "Passwords don't match" error |
| 12.5 | Theme toggle | Click light/dark/system | Theme applied across app |
| 12.6 | Access | BD user navigates to `/settings` | Redirected to `/dashboard` (role-guarded) |

---

## 13. Dev Tasks (`/dev/tasks`)

### 13.1 Board View
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 13.1.1 | Column render | Navigate | 6 columns: Backlog, Ready, In Progress, Q/A, In Review, Completed |
| 13.1.2 | Task cards | Load data | Cards with title, assignee, project, due date |
| 13.1.3 | Drag-and-drop | Drag card between columns | Status updated; DB saved |

### 13.2 Create/Edit Dev Task
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 13.2.1 | Create task | Click "Create Task" | Form: title, description, assignee, project, due date/time |
| 13.2.2 | Successful create | Fill fields, submit | Task created; added to backlog; toast; notification to dev |
| 13.2.3 | Edit task | Click card → edit | Dialog pre-filled; update and save |
| 13.2.4 | Delete task | Click card → delete | Task removed; confirm dialog |

### 13.3 Filter
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 13.3.1 | Filter by dev | Select developer | Board shows only their tasks |
| 13.3.2 | Filter by project | Select project | Board filtered |
| 13.3.3 | Search | Type in search bar | Cards filtered by title |

---

## 14. Notifications

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 14.1 | Notification dropdown | Click bell icon | Dropdown shows recent notifications with type, title, timestamp |
| 14.2 | Notification types | Trigger assignment | Shows: Task assigned, Lead assigned, Account assigned, Dev task assigned |
| 14.3 | Mark as read | Click a notification | `read_at` set; badge count decremented |
| 14.4 | Mark all read | Click "Mark all read" | All notifications marked read; badge disappears |
| 14.5 | Empty state | No notifications | "No notifications" message |
| 14.6 | Unread badge | New notification arrives | Bell shows badge with count |

---

## 15. Data Loading & Error Handling

### 15.1 Query Behavior
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 15.1.1 | Queries disabled before auth | Open page fresh | All queries have `enabled: !!user` — no API calls until user profile loaded |
| 15.1.2 | Retry on failure | Network temporarily fails | Query retries up to 3 times with exponential backoff (1s, 2s, 4s) |
| 15.1.3 | Stale time | Navigate to already-loaded page | Data from cache (not re-fetched) within staleTime window |
| 15.1.4 | Refetch on reconnect | Disconnect WiFi, then reconnect | Queries auto-refetch |
| 15.1.5 | Cache invalidation on mutation | Create/edit/delete data | Related queries auto-invalidated and re-fetched |

### 15.2 Error Boundary
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 15.2.1 | Catch render error | Trigger component crash | "Something went wrong" with error message and "Try again" button |
| 15.2.2 | Recovery | Click "Try again" | Component re-mounted (state reset) |

### 15.3 Route Error Boundary
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 15.3.1 | Route-level error | Navigate to broken route | "Something went wrong" with error message, "Reload page" and "Go back" buttons |

---

## 16. Component States

### 16.1 Loading States
Each data-fetching component should show:
- Initial load: Skeleton/spinner matching component layout
- Filter change: Skeleton or loading overlay
- Mutation in progress: Disabled button with "Loading…" text

### 16.2 Empty States
Each list/grid component should show:
- Informational message describing what the user should do
- CTA link/button (where applicable) to the action they need to take

### 16.3 Error States
- Mutation errors: Toast with error message
- Query errors: Handled by react-query retry; if all retries fail, component shows error state or empty data

---

## 17. UI Polish (Regression)

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 17.1 | Root URL redirect | Navigate to `/` while authenticated | Redirect to `/dashboard` |
| 17.2 | Root URL redirect while unauthenticated | Navigate to `/` while not signed in | Redirect to `/login` |
| 17.3 | 404 catch-all | Navigate to `/nonexistent` | Redirect to `/dashboard` |
| 17.4 | Kanban — vertical scroll per column | Many cards in one column | Cards list scrolls; column header stays fixed; other columns unaffected |
| 17.5 | Data persistence | Log activity, navigate away, come back | Data persisted via Supabase |
| 17.6 | Dark mode | Toggle to dark | UI renders in dark palette |
| 17.7 | Responsive layout | Resize to mobile | Sidebar collapses; layouts adapt |

---

## 18. Database / Supabase

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 18.1 | RLS policies | BD queries only own data | RLS enforces per-user row visibility |
| 18.2 | Anon key | Check Supabase config | `anon` key used (not `service_role`) |
| 18.3 | Session refresh | Token expires | `refreshSession` called every 50 min; silent refresh |
| 18.4 | Lock config | Multiple tabs open | NavigatorLockAcquireTimeoutError avoided via noOpLock |
