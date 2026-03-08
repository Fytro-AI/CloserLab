-- Create a restricted leaderboard view that only exposes necessary data
CREATE VIEW public.leaderboard_view AS
SELECT 
  name,
  xp,
  streak,
  level
FROM public.profiles
ORDER BY xp DESC
LIMIT 100;

-- Grant access to authenticated users
GRANT SELECT ON public.leaderboard_view TO authenticated;
GRANT SELECT ON public.leaderboard_view TO anon;

-- Drop the overly permissive leaderboard SELECT policy
DROP POLICY IF EXISTS "Anyone can view leaderboard data" ON public.profiles;

-- Add explicit deny policies on call_history for UPDATE and DELETE
CREATE POLICY "Call history is immutable"
ON public.call_history FOR UPDATE
USING (false);

CREATE POLICY "Call history cannot be deleted"
ON public.call_history FOR DELETE
USING (false);

-- Update handle_new_user to validate name input
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_name TEXT;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', 'Closer');
  
  IF LENGTH(user_name) > 100 THEN
    user_name := LEFT(user_name, 100);
  END IF;
  
  user_name := REGEXP_REPLACE(user_name, '[^a-zA-Z0-9 ''-]', '', 'g');
  
  IF TRIM(user_name) = '' THEN
    user_name := 'Closer';
  END IF;
  
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, user_name);
  RETURN NEW;
END;
$$;