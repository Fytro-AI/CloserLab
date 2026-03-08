
-- Drop restrictive SELECT policy and replace with permissive one allowing all authenticated users to read profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Now safe to use security_invoker=on since authenticated users can read profiles
ALTER VIEW public.leaderboard_view SET (security_invoker = on);
