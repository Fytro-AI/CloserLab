
CREATE OR REPLACE FUNCTION public.get_profile_sensitive_fields(_user_id uuid)
RETURNS TABLE(is_pro boolean, xp integer, level integer, streak integer, calls_completed integer, weekly_calls_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.is_pro, p.xp, p.level, p.streak, p.calls_completed, p.weekly_calls_count
  FROM public.profiles p
  WHERE p.user_id = _user_id
  LIMIT 1;
$$;
