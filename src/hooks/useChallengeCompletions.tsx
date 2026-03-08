import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ChallengeCompletion {
  id: string;
  user_id: string;
  challenge_id: string;
  difficulty: string;
  score: number;
  passed: boolean;
  xp_earned: number;
  created_at: string;
}

export function useChallengeCompletions() {
  const { user } = useAuth();
  const [completions, setCompletions] = useState<ChallengeCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompletions = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("challenge_completions")
      .select("*")
      .eq("user_id", user.id);
    setCompletions((data as ChallengeCompletion[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCompletions();
  }, [fetchCompletions]);

  const getBestScore = (challengeId: string, difficulty: string): ChallengeCompletion | undefined => {
    return completions.find((c) => c.challenge_id === challengeId && c.difficulty === difficulty);
  };

  const isChallengeUnlocked = (challengeOrder: number): boolean => {
    if (challengeOrder <= 1) return true;
    // A challenge is unlocked if the previous one (by order) has been passed on any difficulty
    return completions.some(
      (c) => c.passed && completions.some((cc) => cc.challenge_id === c.challenge_id)
    );
  };

  const saveCompletion = async (
    challengeId: string,
    difficulty: string,
    score: number,
    passed: boolean,
    xpEarned: number
  ) => {
    if (!user) return;

    const existing = getBestScore(challengeId, difficulty);
    if (existing) {
      // Only update if new score is higher
      if (score > existing.score) {
        await supabase
          .from("challenge_completions")
          .update({ score, passed: passed || existing.passed, xp_earned: xpEarned })
          .eq("id", existing.id);
      }
    } else {
      await supabase.from("challenge_completions").insert({
        user_id: user.id,
        challenge_id: challengeId,
        difficulty,
        score,
        passed,
        xp_earned: xpEarned,
      });
    }
    await fetchCompletions();
  };

  return { completions, loading, fetchCompletions, getBestScore, isChallengeUnlocked, saveCompletion };
}
