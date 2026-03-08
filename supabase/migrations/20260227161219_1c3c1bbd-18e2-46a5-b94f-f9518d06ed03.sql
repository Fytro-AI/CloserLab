
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Closer',
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  streak INTEGER NOT NULL DEFAULT 0,
  calls_completed INTEGER NOT NULL DEFAULT 0,
  skill_objection_handling INTEGER NOT NULL DEFAULT 50,
  skill_confidence INTEGER NOT NULL DEFAULT 50,
  skill_clarity INTEGER NOT NULL DEFAULT 50,
  skill_closing INTEGER NOT NULL DEFAULT 50,
  is_pro BOOLEAN NOT NULL DEFAULT false,
  last_call_date DATE,
  weekly_calls_count INTEGER NOT NULL DEFAULT 0,
  week_start DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Call history table
CREATE TABLE public.call_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  industry TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  persona TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 0,
  overall_score INTEGER NOT NULL DEFAULT 0,
  confidence_score INTEGER NOT NULL DEFAULT 0,
  objection_handling_score INTEGER NOT NULL DEFAULT 0,
  clarity_score INTEGER NOT NULL DEFAULT 0,
  closing_score INTEGER NOT NULL DEFAULT 0,
  strengths TEXT[] NOT NULL DEFAULT '{}',
  weaknesses TEXT[] NOT NULL DEFAULT '{}',
  missed_opportunities TEXT[] NOT NULL DEFAULT '{}',
  improvement_tip TEXT,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  transcript JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own call history"
ON public.call_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own call history"
ON public.call_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'Closer'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Leaderboard: allow reading top profiles (public leaderboard)
CREATE POLICY "Anyone can view leaderboard data"
ON public.profiles FOR SELECT
TO authenticated
USING (true);
