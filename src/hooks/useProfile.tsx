import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  xp: number;
  level: number;
  streak: number;
  calls_completed: number;
  skill_objection_handling: number;
  skill_confidence: number;
  skill_clarity: number;
  skill_closing: number;
  is_pro: boolean;
  weekly_calls_count: number;
  week_start: string | null;
  last_call_date: string | null;
  subscription_tier: "starter" | "pro" | null;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (!user) { setProfile(null); setLoading(false); return; }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    let resolvedProfile = data as Profile | null;

    // Self-heal missing profile rows (can happen for older accounts)
    if (!resolvedProfile) {
      const fallbackName =
        (user.user_metadata?.name as string | undefined)?.trim()?.slice(0, 100) ||
        user.email?.split("@")[0] ||
        "Closer";

      const { data: inserted } = await supabase
        .from("profiles")
        .insert({ user_id: user.id, name: fallbackName })
        .select("*")
        .single();

      resolvedProfile = inserted as Profile;
    }

    setProfile(resolvedProfile);
    setLoading(false);

    // Sync subscription status from Stripe
    try {
      const { data: subData } = await supabase.functions.invoke("check-subscription");
      if (subData && typeof subData.subscribed === "boolean" && data) {
        if (data.is_pro !== subData.subscribed) {
          setProfile((prev) => prev ? { ...prev, is_pro: subData.subscribed } : prev);
        }
      }
    } catch {
      // Silently fail — subscription check is best-effort
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    // Strip sensitive fields that should only be modified server-side
    const { is_pro, xp, level, streak, calls_completed, weekly_calls_count, ...safeUpdates } = updates;
    await supabase.from("profiles").update(safeUpdates).eq("user_id", user.id);
    await fetchProfile();
  };

  const canStartSimulation = () => {
    if (!profile) return false;
    if (profile.is_pro) return true;
    // Reset weekly count if new week
    const now = new Date();
    const weekStart = profile.week_start ? new Date(profile.week_start) : null;
    const daysSinceWeekStart = weekStart
      ? Math.floor((now.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    if (daysSinceWeekStart >= 7) return true; // new week, will reset
    return profile.weekly_calls_count < 3;
  };

  const remainingSimulations = () => {
    if (!profile) return 0;
    if (profile.is_pro) return Infinity;
    const now = new Date();
    const weekStart = profile.week_start ? new Date(profile.week_start) : null;
    const daysSinceWeekStart = weekStart
      ? Math.floor((now.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    if (daysSinceWeekStart >= 7) return 3;
    return Math.max(0, 3 - profile.weekly_calls_count);
  };

  return { profile, loading, fetchProfile, updateProfile, canStartSimulation, remainingSimulations };
}
