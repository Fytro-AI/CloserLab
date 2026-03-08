
CREATE TABLE public.daily_objections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  objection_date date NOT NULL DEFAULT CURRENT_DATE,
  objection_text text NOT NULL,
  buyer_context text,
  user_response text,
  ai_feedback text,
  score integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_objections ENABLE ROW LEVEL SECURITY;

-- Users can only see their own objections
CREATE POLICY "Users can view their own objections"
ON public.daily_objections
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own objections
CREATE POLICY "Users can insert their own objections"
ON public.daily_objections
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own objections (to add response/feedback)
CREATE POLICY "Users can update their own objections"
ON public.daily_objections
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- No deletes
CREATE POLICY "Objections cannot be deleted"
ON public.daily_objections
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);
