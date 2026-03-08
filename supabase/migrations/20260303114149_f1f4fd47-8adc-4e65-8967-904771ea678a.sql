
-- Deny all deletes on profiles
CREATE POLICY "Profiles cannot be deleted"
ON public.profiles
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

-- Secure leaderboard_view: only authenticated users can access
ALTER VIEW public.leaderboard_view SET (security_invoker = on);
REVOKE ALL ON public.leaderboard_view FROM anon;
GRANT SELECT ON public.leaderboard_view TO authenticated;
