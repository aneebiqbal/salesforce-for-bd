ALTER TABLE public.daily_activities
ADD COLUMN IF NOT EXISTS check_in_time timestamptz,
ADD COLUMN IF NOT EXISTS check_out_time timestamptz;
