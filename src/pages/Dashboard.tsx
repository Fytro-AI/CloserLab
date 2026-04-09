import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  TrendingUp, TrendingDown, Minus, Phone, Target,
  BarChart3, Zap, ArrowRight, ChevronRight, Clock,
  AlertCircle, CheckCircle2, Activity, Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useTeamContext } from "@/hooks/useTeamContext";
import SkillGraph from "@/components/SkillGraph";

/* ─── Types ─── */
interface CallRecord {
  id: string;
  created_at: string;
  overall_score: number;
  objection_handling_score: number;
  confidence_score: number;
  clarity_score: number;
  closing_score: number;
  framing_score: number;
  industry: string;
  difficulty: string;
  persona: string;
  simulation_mode: string;
  duration: number;
  user_id?: string;
}

/* ─── Helpers ─── */
function scoreColor(s: number) {
  if (s >= 70) return "text-primary";
  if (s >= 50) return "text-amber-400";
  return "text-destructive";
}

function scoreBg(s: number) {
  if (s >= 70) return "bg-primary/10 border-primary/20";
  if (s >= 50) return "bg-amber-400/10 border-amber-400/20";
  return "bg-destructive/10 border-destructive/20";
}

function delta(current: number, previous: number) {
  if (!previous) return null;
  return Math.round(current - previous);
}

function formatDuration(s: number) {
  if (!s) return "−";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function Trend({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground/30 text-xs">−</span>;
  if (value > 0) return <span className="flex items-center gap-0.5 text-primary text-xs font-bold"><TrendingUp className="h-3 w-3" />+{value}</span>;
  if (value < 0) return <span className="flex items-center gap-0.5 text-destructive text-xs font-bold"><TrendingDown className="h-3 w-3" />{value}</span>;
  return <span className="flex items-center gap-0.5 text-muted-foreground/50 text-xs"><Minus className="h-3 w-3" />0</span>;
}

function SparkBars({ data }: { data: number[] }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm min-w-[3px] transition-all"
          style={{
            height: `${Math.max((v / max) * 100, 8)}%`,
            background: i === data.length - 1 ? "hsl(var(--primary))" : "hsl(var(--border))",
          }}
        />
      ))}
    </div>
  );
}

function ScoreBar({ label, value, prev }: { label: string; value: number; prev?: number }) {
  const d = prev !== undefined ? delta(value, prev) : null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <Trend value={d} />
          <span className={`text-sm font-bold tabular-nums ${scoreColor(value)}`}>{value}</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${value}%`,
            background: value >= 70 ? "hsl(var(--primary))" : value >= 50 ? "hsl(40 95% 60%)" : "hsl(var(--destructive))",
          }}
        />
      </div>
    </div>
  );
}

/* ─── Main ─── */
export default function Dashboard() {
  const { profile, loading: profileLoading } = useProfile();
  const { memberIds, isTeamView, loading: teamLoading } = useTeamContext();
  const navigate = useNavigate();

  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (memberIds.length > 0) loadCalls();
  }, [memberIds]);

  async function loadCalls() {
    if (!memberIds.length) return;
    setLoading(true);

    let query = supabase
      .from("call_history")
      .select(
        "id, created_at, overall_score, objection_handling_score, confidence_score, clarity_score, closing_score, framing_score, industry, difficulty, persona, simulation_mode, duration, user_id"
      )
      .order("created_at", { ascending: false })
      .limit(isTeamView ? 200 : 50);

    if (memberIds.length === 1) {
      query = query.eq("user_id", memberIds[0]);
    } else {
      query = query.in("user_id", memberIds);
    }

    const { data } = await query;
    setCalls((data as CallRecord[]) || []);
    setLoading(false);
  }

  if (profileLoading || teamLoading || loading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <Zap className="h-6 w-6 text-primary animate-pulse" />
      </div>
    );
  }

  const recent = calls.slice(0, 10);
  const last5 = calls.slice(0, 5);
  const prev5 = calls.slice(5, 10);

  const avg = (arr: CallRecord[], key: keyof CallRecord) =>
    arr.length ? Math.round(arr.reduce((a, c) => a + (c[key] as number), 0) / arr.length) : 0;

  const avgScore = avg(last5, "overall_score");
  const prevScore = avg(prev5, "overall_score");
  const avgObj = avg(last5, "objection_handling_score");
  const prevObj = avg(prev5, "objection_handling_score");
  const avgConf = avg(last5, "confidence_score");
  const prevConf = avg(prev5, "confidence_score");
  const avgClarity = avg(last5, "clarity_score");
  const prevClarity = avg(prev5, "clarity_score");
  const avgClosing = avg(last5, "closing_score");
  const prevClosing = avg(prev5, "closing_score");

  const totalCalls = calls.length;
  const scoreHistory = [...calls].reverse().slice(-14).map((c) => c.overall_score);

  const skills = [
    { label: "Objection Handling", value: avgObj },
    { label: "Confidence", value: avgConf },
    { label: "Clarity", value: avgClarity },
    { label: "Closing", value: avgClosing },
  ];
  const weakest = [...skills].sort((a, b) => a.value - b.value)[0];
  const strongest = [...skills].sort((a, b) => b.value - a.value)[0];

  const scoreDelta = delta(avgScore, prevScore);

  const greeting = isTeamView
    ? `Team Overview`
    : `Welcome back, ${profile?.name?.split(" ")[0] ?? "Closer"}`;

  const subline = isTeamView
    ? `${memberIds.length} reps · ${totalCalls} calls logged`
    : totalCalls > 0
    ? `${totalCalls} calls logged · last session ${formatDate(calls[0]?.created_at)}`
    : "No calls yet − start your first simulation";

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8 animate-slide-up">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-foreground tracking-tight">{greeting}</h1>
            {isTeamView && (
              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary border border-primary/30 bg-primary/10 rounded-full px-2 py-0.5">
                <Users className="h-3 w-3" /> Team
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{subline}</p>
        </div>
        <Link
          to="/scenarios"
          className="flex items-center gap-2 rounded-lg gradient-primary px-5 py-2.5 text-sm font-black uppercase tracking-wider text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Phone className="h-4 w-4" /> Start call
        </Link>
      </div>

      {totalCalls === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 py-20 text-center space-y-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card mx-auto">
            <Activity className="h-6 w-6 text-muted-foreground/30" />
          </div>
          <div>
            <p className="font-bold text-foreground">No call data yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              {isTeamView
                ? "None of your reps have logged a call yet."
                : "Complete your first simulation and your metrics will appear here."}
            </p>
          </div>
          <Link to="/scenarios" className="inline-flex items-center gap-2 rounded-lg gradient-primary px-6 py-3 text-sm font-black text-primary-foreground hover:opacity-90 transition-opacity">
            <Zap className="h-4 w-4" /> {isTeamView ? "Run a simulation" : "Run first simulation"}
          </Link>
        </div>
      ) : (
        <>
          {/* ── KPI row ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`rounded-xl border p-5 space-y-3 ${scoreBg(avgScore)}`}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {isTeamView ? "Team Avg" : "Avg Score"}
                </p>
                <Target className="h-4 w-4 text-muted-foreground/30" />
              </div>
              <p className={`text-3xl font-black tabular-nums ${scoreColor(avgScore)}`}>{avgScore}</p>
              <div className="flex items-center gap-2">
                <Trend value={scoreDelta} />
                <span className="text-xs text-muted-foreground">vs prev 5 calls</span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {isTeamView ? "Team Calls" : "Total Calls"}
                </p>
                <Phone className="h-4 w-4 text-muted-foreground/30" />
              </div>
              <p className="text-3xl font-black text-foreground tabular-nums">{totalCalls}</p>
              <div className="h-8">
                <SparkBars data={scoreHistory} />
              </div>
            </div>

            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Needs Work</p>
                <AlertCircle className="h-4 w-4 text-destructive/50" />
              </div>
              <p className="text-lg font-black text-foreground leading-tight">{weakest?.label}</p>
              <p className={`text-2xl font-black tabular-nums ${scoreColor(weakest?.value ?? 0)}`}>{weakest?.value ?? 0}</p>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Strongest</p>
                <CheckCircle2 className="h-4 w-4 text-primary/50" />
              </div>
              <p className="text-lg font-black text-foreground leading-tight">{strongest?.label}</p>
              <p className="text-2xl font-black text-primary tabular-nums">{strongest?.value ?? 0}</p>
            </div>
          </div>

          {/* ── Skill breakdown + trend chart ── */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-black text-foreground">Skill Breakdown</p>
                  <p className="text-xs text-muted-foreground">
                    {isTeamView ? "Team avg · last 5 calls vs previous 5" : "Avg of last 5 calls vs previous 5"}
                  </p>
                </div>
                <BarChart3 className="h-4 w-4 text-muted-foreground/30" />
              </div>
              <div className="space-y-4">
                <ScoreBar label="Objection Handling" value={avgObj} prev={prevObj} />
                <ScoreBar label="Confidence" value={avgConf} prev={prevConf} />
                <ScoreBar label="Clarity" value={avgClarity} prev={prevClarity} />
                <ScoreBar label="Closing" value={avgClosing} prev={prevClosing} />
              </div>
            </div>
              <SkillGraph userIds={memberIds} isTeamView={isTeamView} />
          </div>

          {/* ── Quick actions ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Run a simulation", desc: "Practice before the real call", to: "/scenarios", icon: Zap },
              { label: "View call history", desc: isTeamView ? "All team sessions and breakdowns" : "Review past sessions and breakdowns", to: "/history", icon: Clock },
              { label: "Team metrics", desc: "See how your team is performing", to: "/metrics", icon: BarChart3 },
            ].map((action) => (
              <Link key={action.to} to={action.to} className="group flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 hover:border-primary/30 hover:bg-primary/5 transition-all">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary group-hover:bg-primary/10 transition-colors">
                    <action.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.desc}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
              </Link>
            ))}
          </div>

          {/* ── Recent calls table ── */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="font-black text-foreground">
                  {isTeamView ? "Recent Team Calls" : "Recent Calls"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isTeamView ? `Last ${Math.min(recent.length, 10)} sessions across all reps` : `Your last ${Math.min(recent.length, 10)} sessions`}
                </p>
              </div>
              <Link to="/history" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="hidden md:grid grid-cols-[1fr_80px_80px_80px_80px_80px_80px] gap-4 px-5 py-2.5 border-b border-border bg-secondary/20">
              {["Session", "Score", "Obj.", "Conf.", "Clarity", "Close", "Duration"].map((h) => (
                <p key={h} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">{h}</p>
              ))}
            </div>

            <div className="divide-y divide-border">
              {recent.map((call) => (
                <div
                  key={call.id}
                  onClick={() => navigate("/history")}
                  className="grid grid-cols-1 md:grid-cols-[1fr_80px_80px_80px_80px_80px_80px] gap-4 px-5 py-4 hover:bg-secondary/20 transition-colors cursor-pointer"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <p className="text-sm font-semibold text-foreground capitalize truncate">
                      {call.simulation_mode === "interview"
                        ? `Interview · ${call.industry}`
                        : `${call.simulation_mode?.replace("-", " ") || "Discovery"} · ${call.industry}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {call.difficulty} · {formatDate(call.created_at)}
                    </p>
                  </div>
                  <div className="flex md:block items-center gap-2">
                    <span className="text-[10px] text-muted-foreground md:hidden">Score</span>
                    <p className={`text-sm font-black tabular-nums ${scoreColor(call.overall_score)}`}>{call.overall_score}</p>
                  </div>
                  <div className="hidden md:block">
                    <p className={`text-sm font-bold tabular-nums ${scoreColor(call.objection_handling_score)}`}>{call.objection_handling_score}</p>
                  </div>
                  <div className="hidden md:block">
                    <p className={`text-sm font-bold tabular-nums ${scoreColor(call.confidence_score)}`}>{call.confidence_score}</p>
                  </div>
                  <div className="hidden md:block">
                    <p className={`text-sm font-bold tabular-nums ${scoreColor(call.clarity_score)}`}>{call.clarity_score}</p>
                  </div>
                  <div className="hidden md:block">
                    <p className={`text-sm font-bold tabular-nums ${scoreColor(call.closing_score)}`}>{call.closing_score}</p>
                  </div>
                  <div className="hidden md:flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <p className="text-xs tabular-nums">{formatDuration(call.duration)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}