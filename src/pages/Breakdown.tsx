import { useState, useEffect, useRef } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, CheckCircle, XCircle, TrendingUp, Zap, Loader2,
  Trophy, X, Target, Briefcase, FileText, BarChart3, MessageSquare,
  ChevronDown, ChevronUp,
} from "lucide-react";
import SkillBar from "@/components/SkillBar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { calculateXP } from "@/lib/game-data";
import { useChallengeCompletions } from "@/hooks/useChallengeCompletions";
import { useCallRecorder } from "@/hooks/useCallRecorder";

interface Scores {
  overall_score: number;
  confidence_score: number;
  objection_handling_score: number;
  clarity_score: number;
  closing_score: number;
  // Deep analysis
  call_summary?: string;
  customer_response?: string;
  overall_impression?: string;
  // Meeting Setter
  speed_to_value_score?: number;
  clarity_of_ask_score?: number;
  booking_attempt_score?: number;
  meeting_booked?: boolean;
  // Interview
  communication_score?: number;
  sales_knowledge_score?: number;
  self_awareness_score?: number;
  interview_passed?: boolean;
  strengths: string[];
  weaknesses: string[];
  missed_opportunities: string[];
  improvement_tip: string;
}

/* ── Collapsible section ── */
function Section({ title, icon: Icon, children, defaultOpen = true }: {
  title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/20 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 text-muted-foreground/50" />
          <span className="text-sm font-black uppercase tracking-widest text-muted-foreground">{title}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground/40" /> : <ChevronDown className="h-4 w-4 text-muted-foreground/40" />}
      </button>
      {open && <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">{children}</div>}
    </div>
  );
}

/* ── Score pill ── */
function ScorePill({ value }: { value: number }) {
  const color = value >= 70 ? "text-primary bg-primary/10 border-primary/20"
    : value >= 50 ? "text-amber-400 bg-amber-400/10 border-amber-400/20"
    : "text-destructive bg-destructive/10 border-destructive/20";
  return (
    <span className={`inline-flex items-center justify-center rounded-lg border px-3 py-1 text-2xl font-black tabular-nums ${color}`}>
      {value}
    </span>
  );
}

export default function Breakdown() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading: profileLoading, fetchProfile } = useProfile();
  const { saveCompletion } = useChallengeCompletions();
  const state = (location.state as any) || {};
  const {
    transcript = [],
    industry = "saas",
    difficulty = "easy",
    persona = "skeptical",
    duration = 0,
    simulationMode = "discovery",
    challengeId,
    challengeName,
    challengeGoal,
    challengePassScore,
    interviewRole,
    interviewCompany,
  } = state;

  const isMeetingSetter = simulationMode === "meeting-setter";
  const isInterview = simulationMode === "interview";

  const [scores, setScores] = useState<Scores | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [xpEarned, setXpEarned] = useState(0);
  const savedRef = useRef(false);
  const { uploadRecording } = useCallRecorder();
  const audioBlob = location.state?.audioBlob as Blob | undefined;

  useEffect(() => {
    if (transcript.length === 0) { navigate("/scenarios"); return; }
    scoreCall();
  }, []);

  useEffect(() => {
    if (scores && user && profile && !savedRef.current && !profileLoading) {
      savedRef.current = true;
      const streak = profile.streak ?? 0;
      const earned = calculateXP(scores.overall_score, difficulty, streak);
      setXpEarned(earned);
      saveResults(scores, earned);
      if (challengeId) {
        const passed = scores.overall_score >= (challengePassScore || 70);
        saveCompletion(challengeId, difficulty, scores.overall_score, passed, earned);
      }
    }
  }, [scores, user, profile, profileLoading]);

  const scoreCall = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/score-call`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
          body: JSON.stringify({ transcript, industry, difficulty, persona, simulationMode, interviewRole, interviewCompany }),
        }
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Failed to score call");
      setScores(data as Scores);
    } catch (e: any) {
      setError(e.message || "Failed to score call");
    } finally {
      setLoading(false);
    }
  };

  const saveResults = async (data: Scores, earned: number) => {
    if (!user || !profile) return;

    const { data: insertedCall } = await supabase
      .from("call_history")
      .insert({
        user_id: user.id,
        industry, difficulty, persona, duration,
        overall_score: data.overall_score,
        confidence_score: data.confidence_score,
        objection_handling_score: data.objection_handling_score,
        clarity_score: data.clarity_score,
        closing_score: data.closing_score,
        strengths: data.strengths,
        weaknesses: data.weaknesses,
        missed_opportunities: data.missed_opportunities,
        improvement_tip: data.improvement_tip,
        // New deep analysis fields
        call_summary: data.call_summary ?? null,
        customer_response: data.customer_response ?? null,
        overall_impression: data.overall_impression ?? null,
        xp_earned: earned,
        transcript,
        simulation_mode: simulationMode,
      })
      .select("id")
      .single();

    // Upload recording if available
    if (audioBlob && insertedCall?.id) {
      try {
        const path = await uploadRecording(audioBlob, insertedCall.id);
        if (path) {
          // Update the call with the recording path
          await supabase.from("call_history").update({ recording_url: path }).eq("id", insertedCall.id);
          console.log("Recording saved:", path);
        }
      } catch (e) {
        console.warn("Recording upload failed:", e);
      }
    }

    const newXp = profile.xp + earned;
    const today = new Date().toISOString().split("T")[0];
    let newStreak = profile.streak;
    if (profile.last_call_date) {
      const diff = Math.floor((Date.now() - new Date(profile.last_call_date).getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 1) newStreak += 1;
      else if (diff > 1) newStreak = 1;
    } else {
      newStreak = 1;
    }
    let weeklyCount = profile.weekly_calls_count;
    let weekStart = profile.week_start;
    const now = new Date();
    if (weekStart) {
      const daysSince = Math.floor((now.getTime() - new Date(weekStart).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince >= 7) { weeklyCount = 1; weekStart = today; }
      else { weeklyCount += 1; }
    } else { weeklyCount = 1; weekStart = today; }

    const blend = (old: number, fresh: number) => Math.round(old * 0.7 + fresh * 0.3);

    await supabase.from("profiles").update({
      xp: newXp,
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
          <h2 className="text-xl font-bold text-foreground">
            {isInterview ? "Scoring your interview..." : isMeetingSetter ? "Scoring your cold call..." : "Analyzing your call..."}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Reviewing every moment of the conversation.</p>
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
          <h2 className="text-xl font-bold text-foreground">{isNoSpeech ? "We didn't hear anything" : "Scoring failed"}</h2>
          <p className="text-sm text-muted-foreground">{isNoSpeech ? "Make sure your mic is working and try speaking during the call." : error || "Could not analyze the call."}</p>
        </div>
        <Link to="/scenarios" className="text-primary font-semibold hover:underline">Try again</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 space-y-5 animate-slide-up">

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-black text-foreground tracking-tight">
          {isInterview ? "Interview Debrief" : isMeetingSetter ? "Cold Call Debrief" : "Call Debrief"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isInterview
            ? `${interviewRole} · ${interviewCompany}`
            : `${industry} · ${persona} · ${difficulty}`}
        </p>
      </div>

      {/* Result banner */}
      {isInterview && (
        <div className={`rounded-xl border p-5 ${scores.interview_passed ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
          <div className="flex items-center gap-2 mb-1">
            {scores.interview_passed
              ? <Briefcase className="h-5 w-5 text-primary" />
              : <X className="h-5 w-5 text-destructive" />}
            <span className={`text-base font-black uppercase tracking-wider ${scores.interview_passed ? "text-primary" : "text-destructive"}`}>
              {scores.interview_passed ? "Would Move to Next Round" : "Didn't Pass This Round"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {scores.interview_passed
              ? "Strong performance. Review the feedback to sharpen the next round."
              : "Review the weaknesses carefully. Every mock interview is reps for the real one."}
          </p>
        </div>
      )}

      {isMeetingSetter && (
        <div className={`rounded-xl border p-5 ${scores.meeting_booked ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
          <div className="flex items-center gap-2 mb-1">
            {scores.meeting_booked ? <Target className="h-5 w-5 text-primary" /> : <X className="h-5 w-5 text-destructive" />}
            <span className={`text-base font-black uppercase tracking-wider ${scores.meeting_booked ? "text-primary" : "text-destructive"}`}>
              {scores.meeting_booked ? "Meeting Booked 🎯" : "No Meeting Booked"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {scores.meeting_booked ? "You earned the follow-up. That's the whole game." : "The prospect didn't commit. See exactly why below."}
          </p>
        </div>
      )}

      {challengeId && !isMeetingSetter && !isInterview && (
        <div className={`rounded-xl border p-5 ${scores.overall_score >= (challengePassScore || 70) ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
          <div className="flex items-center gap-2 mb-1">
            {scores.overall_score >= (challengePassScore || 70)
              ? <Trophy className="h-5 w-5 text-primary" />
              : <X className="h-5 w-5 text-destructive" />}
            <span className={`text-base font-black uppercase tracking-wider ${scores.overall_score >= (challengePassScore || 70) ? "text-primary" : "text-destructive"}`}>
              {scores.overall_score >= (challengePassScore || 70) ? "Challenge Passed" : "Challenge Failed"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{challengeName} · Need {challengePassScore}+ to pass</p>
        </div>
      )}

      {/* Overall score */}
      <div className="rounded-xl border border-border bg-card p-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Overall Score</p>
          <ScorePill value={scores.overall_score} />
          {xpEarned > 0 && (
            <div className="flex items-center gap-1.5 mt-2 text-sm text-amber-400 font-bold">
              <Zap className="h-3.5 w-3.5" />+{xpEarned} XP
            </div>
          )}
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs text-muted-foreground">{scores.overall_score >= 70 ? "Strong" : scores.overall_score >= 50 ? "Developing" : "Needs Work"}</p>
        </div>
      </div>

      {/* ── CALL SUMMARY ── */}
      {scores.call_summary && (
        <Section title="Call Summary" icon={FileText}>
          <p className="text-sm text-foreground leading-relaxed">{scores.call_summary}</p>
        </Section>
      )}

      {/* ── SCORE BREAKDOWN ── */}
      <Section title="Score Breakdown" icon={BarChart3}>
        {isInterview ? (
          <>
            <SkillBar label="Communication" value={scores.communication_score ?? scores.clarity_score} />
            <SkillBar label="Sales Knowledge" value={scores.sales_knowledge_score ?? scores.closing_score} />
            <SkillBar label="Confidence" value={scores.confidence_score} />
            <SkillBar label="Self-Awareness" value={scores.self_awareness_score ?? scores.objection_handling_score} />
            <SkillBar label="Closing the Interview" value={scores.closing_score} />
          </>
        ) : isMeetingSetter ? (
          <>
            <SkillBar label="Speed to Value" value={scores.speed_to_value_score ?? scores.clarity_score} />
            <SkillBar label="Clarity of Ask" value={scores.clarity_of_ask_score ?? scores.closing_score} />
            <SkillBar label="Objection Handling" value={scores.objection_handling_score} />
            <SkillBar label="Booking Attempt" value={scores.booking_attempt_score ?? scores.closing_score} />
            <SkillBar label="Confidence" value={scores.confidence_score} />
          </>
        ) : (
          <>
            <SkillBar label="Objection Handling" value={scores.objection_handling_score} />
            <SkillBar label="Confidence" value={scores.confidence_score} />
            <SkillBar label="Clarity" value={scores.clarity_score} />
            <SkillBar label="Closing" value={scores.closing_score} />
          </>
        )}
      </Section>

      {/* ── STRENGTHS & WEAKNESSES ── */}
      <Section title="Strengths & Weaknesses" icon={TrendingUp}>
        <div className="space-y-4">
          {scores.strengths.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-primary">Strengths</p>
              <ul className="space-y-2">
                {scores.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {scores.weaknesses.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-destructive">Weaknesses</p>
              <ul className="space-y-2">
                {scores.weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                    <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {scores.missed_opportunities.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-amber-400">Missed Opportunities</p>
              <ul className="space-y-2">
                {scores.missed_opportunities.map((m, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                    <span className="text-amber-400 mt-0.5 flex-shrink-0">→</span>
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Section>

      {/* ── CUSTOMER RESPONSE ── */}
      {scores.customer_response && (
        <Section title={isInterview ? "Interviewer Response" : "Prospect Response"} icon={MessageSquare} defaultOpen={false}>
          <p className="text-sm text-foreground leading-relaxed">{scores.customer_response}</p>
        </Section>
      )}

      {/* ── OVERALL IMPRESSION / VERDICT ── */}
      {(scores.overall_impression || scores.improvement_tip) && (
        <Section title="Coach's Verdict" icon={TrendingUp}>
          {scores.overall_impression && (
            <p className="text-sm text-foreground leading-relaxed">{scores.overall_impression}</p>
          )}
          {scores.improvement_tip && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 mt-2">
              <p className="text-xs font-black uppercase tracking-widest text-primary mb-1.5">Next call: do this</p>
              <p className="text-sm font-semibold text-foreground leading-relaxed">{scores.improvement_tip}</p>
            </div>
          )}
        </Section>
      )}

      {/* ── TRANSCRIPT ── */}
      <Section title="Transcript" icon={MessageSquare} defaultOpen={false}>
        {transcript.length === 0 ? (
          <p className="text-sm text-muted-foreground/40">No transcript available.</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {transcript.map((msg: any, i: number) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "gradient-primary text-primary-foreground"
                    : "bg-secondary text-foreground"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Link
          to={challengeId ? "/challenges" : "/scenarios"}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg gradient-primary py-3 font-bold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          {isInterview ? "Practice Again" : "Train Again"} <ArrowRight className="h-4 w-4" />
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