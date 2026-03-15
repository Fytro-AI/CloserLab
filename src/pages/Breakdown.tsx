import { useState, useEffect, useRef } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle, XCircle, TrendingUp, Zap, Loader2, Trophy, X } from "lucide-react";
import SkillBar from "@/components/SkillBar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { calculateXP, calculateLevel } from "@/lib/game-data";
import { useChallengeCompletions } from "@/hooks/useChallengeCompletions";

interface Scores {
  overall_score: number;
  confidence_score: number;
  objection_handling_score: number;
  clarity_score: number;
  closing_score: number;
  strengths: string[];
  weaknesses: string[];
  missed_opportunities: string[];
  improvement_tip: string;
}

export default function Breakdown() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading: profileLoading, fetchProfile } = useProfile();
  const { saveCompletion } = useChallengeCompletions();
  const state = (location.state as any) || {};
  const {
    transcript = [], industry = "saas", difficulty = "easy", persona = "skeptical", duration = 0,
    challengeId, challengeName, challengeGoal, challengePassScore,
  } = state;

  const [scores, setScores] = useState<Scores | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [xpEarned, setXpEarned] = useState(0);
  const savedRef = useRef(false);

  useEffect(() => {
    if (transcript.length === 0) {
      navigate("/scenarios");
      return;
    }
    scoreCall();
  }, []);

  // Save results once profile is loaded and scores are ready
  useEffect(() => {
    if (scores && user && profile && !savedRef.current && !profileLoading) {
      savedRef.current = true;
      const streak = profile.streak ?? 0;
      const earned = calculateXP(scores.overall_score, difficulty, streak);
      setXpEarned(earned);
      saveResults(scores, earned);

      // Save challenge completion if this was a challenge
      if (challengeId) {
        const passed = scores.overall_score >= (challengePassScore || 70);
        saveCompletion(challengeId, difficulty, scores.overall_score, passed, earned);
      }
    }
  }, [scores, user, profile, profileLoading]);

  const scoreCall = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/score-call`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ transcript, industry, difficulty, persona }),
        }
      );

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data?.error || "Failed to score call");
      }

      setScores(data as Scores);
    } catch (e: any) {
      console.error("Scoring error:", e);
      setError(e.message || "Failed to score call");
    } finally {
      setLoading(false);
    }
  };

  const saveResults = async (data: Scores, earned: number) => {
    if (!user || !profile) return;

    // Save call history
    await supabase.from("call_history").insert({
      user_id: user.id,
      industry,
      difficulty,
      persona,
      duration,
      overall_score: data.overall_score,
      confidence_score: data.confidence_score,
      objection_handling_score: data.objection_handling_score,
      clarity_score: data.clarity_score,
      closing_score: data.closing_score,
      strengths: data.strengths,
      weaknesses: data.weaknesses,
      missed_opportunities: data.missed_opportunities,
      improvement_tip: data.improvement_tip,
      xp_earned: earned,
      transcript,
    });

    // Update profile
    const newXp = profile.xp + earned;
    const today = new Date().toISOString().split("T")[0];
    const lastCallDate = profile.last_call_date;

    // Streak logic
    let newStreak = profile.streak;
    if (lastCallDate) {
      const last = new Date(lastCallDate);
      const diff = Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 1) newStreak += 1;
      else if (diff > 1) newStreak = 1;
    } else {
      newStreak = 1;
    }

    // Weekly calls tracking
    const now = new Date();
    let weeklyCount = profile.weekly_calls_count;
    let weekStart = profile.week_start;
    if (weekStart) {
      const ws = new Date(weekStart);
      const daysSince = Math.floor((now.getTime() - ws.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince >= 7) {
        weeklyCount = 1;
        weekStart = today;
      } else {
        weeklyCount += 1;
      }
    } else {
      weeklyCount = 1;
      weekStart = today;
    }

    // Update skill averages (weighted: 70% old, 30% new)
    const blend = (old: number, fresh: number) => Math.round(old * 0.7 + fresh * 0.3);

    await supabase.from("profiles").update({
      xp: newXp,
      level: calculateLevel(newXp),
      streak: newStreak,
      calls_completed: profile.calls_completed + 1,
      skill_objection_handling: blend(profile.skill_objection_handling, data.objection_handling_score),
      skill_confidence: blend(profile.skill_confidence, data.confidence_score),
      skill_clarity: blend(profile.skill_clarity, data.clarity_score),
      skill_closing: blend(profile.skill_closing, data.closing_score),
      last_call_date: today,
      weekly_calls_count: weeklyCount,
      week_start: weekStart,
    }).eq("user_id", user.id);

    await fetchProfile();
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground">Analyzing your call...</h2>
          <p className="text-sm text-muted-foreground mt-1">Our AI coach is reviewing every word.</p>
        </div>
      </div>
    );
  }

  if (error || !scores) {
    const isNoSpeech = error?.includes("No speech detected");
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-4 px-4">
        <div className="text-4xl">{isNoSpeech ? "🎤" : "😅"}</div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-foreground">
            {isNoSpeech ? "We didn't hear anything" : "Scoring failed"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isNoSpeech
              ? "Make sure your mic is working and try speaking during the call."
              : error || "Could not analyze the call."}
          </p>
        </div>
        <Link to="/scenarios" className="text-primary font-semibold hover:underline">
          Try again
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 space-y-6 animate-slide-up">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-foreground">Call Complete.</h1>
        <p className="text-muted-foreground">Here's your debrief, soldier.</p>
      </div>

      {/* Challenge Result Banner */}
      {challengeId && (
        <div className={`rounded-lg border p-5 text-center ${
          scores.overall_score >= (challengePassScore || 70)
            ? "border-success/30 bg-success/10"
            : "border-destructive/30 bg-destructive/10"
        }`}>
          <div className="flex items-center justify-center gap-2 mb-1">
            {scores.overall_score >= (challengePassScore || 70) ? (
              <Trophy className="h-6 w-6 text-success" />
            ) : (
              <X className="h-6 w-6 text-destructive" />
            )}
            <span className={`text-lg font-black uppercase tracking-wider ${
              scores.overall_score >= (challengePassScore || 70) ? "text-success" : "text-destructive"
            }`}>
              {scores.overall_score >= (challengePassScore || 70) ? "Challenge Passed" : "Challenge Failed"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {challengeName} — Need {challengePassScore}+ to pass
          </p>
        </div>
      )}

      {/* Score */}
      <div className="rounded-lg border border-border bg-card p-8 text-center card-glow">
        <div className="text-6xl font-black text-primary text-glow mb-2">{scores.overall_score}</div>
        <p className="text-sm text-muted-foreground uppercase tracking-widest">Overall Score</p>
        <div className="mt-4 flex items-center justify-center gap-2 text-accent font-bold">
          <Zap className="h-5 w-5" />
          +{xpEarned} XP Earned
        </div>
      </div>

      {/* Skills */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Performance Breakdown</h2>
        <SkillBar label="Objection Handling" value={scores.objection_handling_score} />
        <SkillBar label="Confidence" value={scores.confidence_score} />
        <SkillBar label="Clarity" value={scores.clarity_score} />
        <SkillBar label="Closing" value={scores.closing_score} />
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <h3 className="flex items-center gap-2 font-bold text-success text-sm uppercase tracking-widest">
            <CheckCircle className="h-4 w-4" /> Strengths
          </h3>
          <ul className="space-y-2">
            {scores.strengths.map((s, i) => (
              <li key={i} className="text-sm text-foreground">• {s}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <h3 className="flex items-center gap-2 font-bold text-danger text-sm uppercase tracking-widest">
            <XCircle className="h-4 w-4" /> Weaknesses
          </h3>
          <ul className="space-y-2">
            {scores.weaknesses.map((w, i) => (
              <li key={i} className="text-sm text-foreground">• {w}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Improvement Tip */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-5 space-y-3">
        <h3 className="flex items-center gap-2 font-bold text-primary text-sm uppercase tracking-widest">
          <TrendingUp className="h-4 w-4" /> Coach's Verdict
        </h3>
        <p className="text-sm text-foreground leading-relaxed font-semibold">{scores.improvement_tip}</p>
        {scores.missed_opportunities.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Missed Opportunities</p>
            {scores.missed_opportunities.map((m, i) => (
              <p key={i} className="text-sm text-foreground">• {m}</p>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          to={challengeId ? "/challenges" : "/scenarios"}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg gradient-primary py-3 font-bold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          {challengeId ? "Back to Challenges" : "Train Again"} <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/"
          className="flex-1 flex items-center justify-center rounded-lg border border-border bg-card py-3 font-bold text-foreground hover:bg-secondary transition-colors"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
