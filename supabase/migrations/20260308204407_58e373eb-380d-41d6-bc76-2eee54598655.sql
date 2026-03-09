
CREATE OR REPLACE FUNCTION public.complete_call(
  _user_id uuid,
  _xp_earned integer,
  _streak integer,
  _weekly_calls_count integer,
  _week_start date,
  _last_call_date date,
  _skill_objection_handling integer,
  _skill_confidence integer,
  _skill_clarity integer,
  _skill_closing integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_profile profiles%ROWTYPE;
  new_xp integer;
  new_level integer;
BEGIN
  -- Verify the caller is the owner
  IF auth.uid() IS NULL OR auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO current_profile FROM profiles WHERE user_id = _user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  new_xp := current_profile.xp + _xp_earned;
  new_level := FLOOR(new_xp / 200) + 1;

  UPDATE profiles SET
    xp = new_xp,
    level = new_level,
    streak = _streak,
    calls_completed = current_profile.calls_completed + 1,
    weekly_calls_count = _weekly_calls_count,
    week_start = _week_start,
    last_call_date = _last_call_date,
    skill_objection_handling = _skill_objection_handling,
    skill_confidence = _skill_confidence,
    skill_clarity = _skill_clarity,
    skill_closing = _skill_closing
  WHERE user_id = _user_id;
END;
$$;
