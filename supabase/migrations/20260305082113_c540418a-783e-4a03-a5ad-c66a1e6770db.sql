CREATE TABLE public.challenge_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  challenge_id text NOT NULL,
  difficulty text NOT NULL DEFAULT 'easy',
  score integer NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  xp_earned integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_id, difficulty)
);

ALTER TABLE public.challenge_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own challenge completions"
  ON public.challenge_completions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenge completions"
  ON public.challenge_completions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenge completions"
  ON public.challenge_completions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Challenge completions cannot be deleted"
  ON public.challenge_completions FOR DELETE
  TO authenticated
  USING (false);