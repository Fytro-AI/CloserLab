
-- Revert to own-profile-only SELECT
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- View runs as owner to aggregate leaderboard data
ALTER VIEW public.leaderboard_view SET (security_invoker = off);
