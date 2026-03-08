
-- Revert security_invoker so view runs as owner (can read all profiles for leaderboard)
ALTER VIEW public.leaderboard_view SET (security_invoker = off);
