-- First registered user becomes admin (run after 001_initial_schema.sql)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assign_role text;
BEGIN
  SELECT CASE WHEN (SELECT COUNT(*) FROM public.user_profiles) = 0 THEN 'admin' ELSE 'staff' END INTO assign_role;
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    assign_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
