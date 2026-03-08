
-- Drop the view and create a function instead
DROP VIEW IF EXISTS public.leaderboard_view;

CREATE OR REPLACE FUNCTION public.get_leaderboard(row_limit integer DEFAULT 20)
RETURNS TABLE(name text, xp integer, level integer, streak integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.name, p.xp, p.level, p.streak
  FROM public.profiles p
  ORDER BY p.xp DESC
  LIMIT row_limit;
$$;

-- Only authenticated users can call it
REVOKE ALL ON FUNCTION public.get_leaderboard(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO authenticated;
