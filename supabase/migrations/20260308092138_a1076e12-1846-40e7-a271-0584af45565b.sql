
CREATE POLICY "Users cannot modify sensitive profile fields"
ON public.profiles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  is_pro = (SELECT f.is_pro FROM public.get_profile_sensitive_fields(auth.uid()) f) AND
  xp = (SELECT f.xp FROM public.get_profile_sensitive_fields(auth.uid()) f) AND
  level = (SELECT f.level FROM public.get_profile_sensitive_fields(auth.uid()) f) AND
  streak = (SELECT f.streak FROM public.get_profile_sensitive_fields(auth.uid()) f) AND
  calls_completed = (SELECT f.calls_completed FROM public.get_profile_sensitive_fields(auth.uid()) f) AND
  weekly_calls_count = (SELECT f.weekly_calls_count FROM public.get_profile_sensitive_fields(auth.uid()) f)
);
