import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeamContext } from "@/hooks/useTeamContext";
import { PERSONAS, INDUSTRIES, DIFFICULTIES } from "@/lib/game-data";
import {
  Eye, Zap, Calendar, Clock, Search, Filter, X,
  ChevronLeft, ChevronRight, Mic, Headphones, Users,
  FileText, MessageSquare, TrendingUp, CheckCircle, XCircle,
} from "lucide-react";
import AudioPlayer from "@/components/AudioPlayer";

interface CallRecord {
  id: string;
  industry: string;
  difficulty: string;
  persona: string;
  overall_score: number;
  xp_earned: number;
  duration: number;
  created_at: string;
  transcript: any[];
  confidence_score: number;
  objection_handling_score: number;
  clarity_score: number;
  closing_score: number;
  strengths: string[];
  weaknesses: string[];
  missed_opportunities: string[];
  improvement_tip: string;
  simulation_mode?: string;
  recording_url?: string | null;
  user_id?: string;
  // Deep analysis
  call_summary?: string | null;
  customer_response?: string | null;
  overall_impression?: string | null;
}

const PAGE_SIZE = 15;

function scoreColor(s: number) {
  if (s >= 70) return "text-primary";
  if (s >= 50) return "text-amber-400";
  return "text-destructive";
}

function scoreBadge(s: number) {
  if (s >= 70) return "bg-primary/10 border-primary/30 text-primary";
  if (s >= 50) return "bg-amber-400/10 border-amber-400/30 text-amber-400";
  return "bg-destructive/10 border-destructive/30 text-destructive";
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(s: number) {
  if (!s) return "−";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

type DetailTab = "summary" | "scores" | "transcript";

function CallDetail({ call, onClose }: { call: CallRecord; onClose: () => void }) {
  const [tab, setTab] = useState<DetailTab>("summary");
  const getPersonaLabel = (id: string) => PERSONAS.find((p) => p.id === id)?.label || id;
  const getIndustryLabel = (id: string) => INDUSTRIES.find((i) => i.id === id)?.label || id;

  const scoreRows = [
    { label: "Objection Handling", value: call.objection_handling_score },
    { label: "Confidence", value: call.confidence_score },
    { label: "Clarity", value: call.clarity_score },
    { label: "Closing", value: call.closing_score },
  ];

  const TABS: { key: DetailTab; label: string }[] = [
    { key: "summary", label: "Analysis" },
    { key: "scores", label: "Scores" },
    { key: "transcript", label: "Transcript" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in px-4">
      <div className="relative w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-base font-black text-foreground">
              {getIndustryLabel(call.industry)} · {getPersonaLabel(call.persona)}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDate(call.created_at)} at {formatTime(call.created_at)} · {formatDuration(call.duration)}
              {call.simulation_mode && call.simulation_mode !== "discovery" && (
                <span className="ml-2 text-[10px] border border-border rounded px-1.5 py-0.5 uppercase font-bold text-muted-foreground/50">
                  {call.simulation_mode.replace("-", " ")}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-2xl font-black tabular-nums ${scoreColor(call.overall_score)}`}>
              {call.overall_score}
            </span>
            <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground/50 hover:text-foreground hover:bg-secondary transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border flex-shrink-0 px-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* ── ANALYSIS TAB ── */}
          {tab === "summary" && (
            <div className="space-y-5">
              {/* Recording */}
              {call.recording_url ? (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Headphones className="h-3.5 w-3.5" /> Call Recording
                  </p>
                  <AudioPlayer callId={call.id} storagePath={call.recording_url} duration={call.duration} />
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-secondary/10 px-4 py-3 flex items-center gap-2">
                  <Headphones className="h-4 w-4 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground/40">No recording available for this session.</p>
                </div>
              )}

              {/* Call Summary */}
              {call.call_summary && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Call Summary
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">{call.call_summary}</p>
                </div>
              )}

              {/* Strengths */}
              {call.strengths?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary">Strengths</p>
                  <ul className="space-y-2">
                    {call.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weaknesses */}
              {call.weaknesses?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-destructive">Weaknesses</p>
                  <ul className="space-y-2">
                    {call.weaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                        <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Missed opportunities */}
              {call.missed_opportunities?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-amber-400">Missed Opportunities</p>
                  <ul className="space-y-2">
                    {call.missed_opportunities.map((m, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="text-amber-400 flex-shrink-0 mt-0.5">→</span>
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Prospect response */}
              {call.customer_response && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" /> Prospect Response
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">{call.customer_response}</p>
                </div>
              )}

              {/* Overall impression */}
              {call.overall_impression && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" /> Overall Impression
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">{call.overall_impression}</p>
                </div>
              )}

              {/* Coach tip */}
              {call.improvement_tip && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1.5">Next call: do this</p>
                  <p className="text-sm font-semibold text-foreground leading-relaxed">{call.improvement_tip}</p>
                </div>
              )}

              {/* Fallback if no analysis fields */}
              {!call.call_summary && !call.overall_impression && !call.improvement_tip && (
                <p className="text-sm text-muted-foreground/40 text-center py-6">
                  Detailed analysis is available on calls made after the latest update.
                </p>
              )}
            </div>
          )}

          {/* ── SCORES TAB ── */}
          {tab === "scores" && (
            <div className="grid grid-cols-2 gap-3">
              {scoreRows.map((s) => (
                <div key={s.label} className="rounded-lg border border-border bg-secondary/20 px-4 py-3 space-y-2">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${s.value}%`, background: s.value >= 70 ? "hsl(var(--primary))" : s.value >= 50 ? "hsl(40 95% 60%)" : "hsl(var(--destructive))" }} />
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${scoreColor(s.value)}`}>{s.value}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── TRANSCRIPT TAB ── */}
          {tab === "transcript" && (
            <div className="space-y-2">
              {call.transcript?.length > 0 ? (
                call.transcript.map((msg: any, i: number) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user" ? "gradient-primary text-primary-foreground" : "bg-secondary text-foreground"
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground/40 text-center py-6">No transcript available.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main ── */
export default function CallHistory() {
  const { user } = useAuth();
  const { memberIds, isTeamView, loading: teamLoading } = useTeamContext();
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);

  const [search, setSearch] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [filterMode, setFilterMode] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!teamLoading && memberIds.length > 0) fetchCalls();
  }, [memberIds, teamLoading]);

  async function fetchCalls() {
    setLoading(true);
    let query = supabase
      .from("call_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (memberIds.length === 1) {
      query = query.eq("user_id", memberIds[0]);
    } else {
      query = query.in("user_id", memberIds);
    }

    const { data } = await query;
    setCalls((data as CallRecord[]) || []);
    setLoading(false);
  }

  useEffect(() => { setPage(1); }, [search, filterIndustry, filterDifficulty, filterMode]);

  const getPersonaLabel = (id: string) => PERSONAS.find((p) => p.id === id)?.label || id;
  const getIndustryLabel = (id: string) => INDUSTRIES.find((i) => i.id === id)?.label || id;
  const getDiff = (id: string) => DIFFICULTIES.find((d) => d.id === id);

  const filtered = useMemo(() => {
    return calls.filter((c) => {
      const industryLabel = getIndustryLabel(c.industry).toLowerCase();
      const personaLabel = getPersonaLabel(c.persona).toLowerCase();
      const q = search.toLowerCase();
      if (q && !industryLabel.includes(q) && !personaLabel.includes(q)) return false;
      if (filterIndustry && c.industry !== filterIndustry) return false;
      if (filterDifficulty && c.difficulty !== filterDifficulty) return false;
      if (filterMode && (c.simulation_mode || "discovery") !== filterMode) return false;
      return true;
    });
  }, [calls, search, filterIndustry, filterDifficulty, filterMode]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = search || filterIndustry || filterDifficulty || filterMode;
  const clearFilters = () => { setSearch(""); setFilterIndustry(""); setFilterDifficulty(""); setFilterMode(""); };

  const uniqueIndustries = [...new Set(calls.map((c) => c.industry))];
  const uniqueModes = [...new Set(calls.map((c) => c.simulation_mode || "discovery"))];

  const selectClass = "rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors";

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6 animate-slide-up">
      {selectedCall && <CallDetail call={selectedCall} onClose={() => setSelectedCall(null)} />}

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-foreground tracking-tight">
              {isTeamView ? "Team History" : "Call History"}
            </h1>
            {isTeamView && (
              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary border border-primary/30 bg-primary/10 rounded-full px-2 py-0.5">
                <Users className="h-3 w-3" /> Team
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {calls.length} sessions · {filtered.length} shown
            {isTeamView && ` · ${memberIds.length} reps`}
          </p>
        </div>
        <Link to="/scenarios" className="flex items-center gap-2 rounded-lg gradient-primary px-4 py-2.5 text-sm font-black uppercase tracking-wider text-primary-foreground hover:opacity-90 transition-opacity">
          <Mic className="h-4 w-4" /> New call
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search industry or persona…"
            className="w-full rounded-lg border border-border bg-secondary/30 pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors" />
        </div>
        <select value={filterIndustry} onChange={(e) => setFilterIndustry(e.target.value)} className={selectClass}>
          <option value="">All industries</option>
          {uniqueIndustries.map((i) => <option key={i} value={i}>{getIndustryLabel(i)}</option>)}
        </select>
        <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)} className={selectClass}>
          <option value="">All difficulties</option>
          {DIFFICULTIES.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
        <select value={filterMode} onChange={(e) => setFilterMode(e.target.value)} className={selectClass}>
          <option value="">All modes</option>
          {uniqueModes.map((m) => <option key={m} value={m}>{m.replace("-", " ")}</option>)}
        </select>
        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Zap className="h-5 w-5 animate-pulse text-muted-foreground/40" />
        </div>
      ) : calls.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 py-20 text-center space-y-4">
          <p className="text-muted-foreground">{isTeamView ? "No team calls yet." : "No calls yet. Get in the arena."}</p>
          <Link to="/scenarios" className="text-primary font-semibold hover:underline text-sm">Start training →</Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 py-16 text-center space-y-3">
          <Filter className="h-6 w-6 text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground text-sm">No calls match your filters.</p>
          <button onClick={clearFilters} className="text-primary text-sm font-semibold hover:underline">Clear filters</button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_100px_72px_72px_72px_72px_80px_24px_40px] gap-3 px-5 py-3 border-b border-border bg-secondary/20">
            {["Session", "Date", "Score", "Obj.", "Conf.", "Clarity", "Duration", "", ""].map((h, i) => (
              <p key={i} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">{h}</p>
            ))}
          </div>
          <div className="divide-y divide-border">
            {paginated.map((call) => {
              const diff = getDiff(call.difficulty);
              return (
                <div key={call.id} onClick={() => setSelectedCall(call)}
                  className="grid grid-cols-1 md:grid-cols-[1fr_100px_72px_72px_72px_72px_80px_24px_40px] gap-3 px-5 py-3.5 hover:bg-secondary/20 transition-colors cursor-pointer items-center">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-foreground truncate">{getIndustryLabel(call.industry)}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground truncate">{getPersonaLabel(call.persona)}</span>
                      {diff && <span className={`text-[10px] font-bold uppercase tracking-wide ${diff.color}`}>{diff.label}</span>}
                      {call.simulation_mode && call.simulation_mode !== "discovery" && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/50 border border-border rounded px-1">
                          {call.simulation_mode.replace("-", " ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-xs text-muted-foreground">{formatDate(call.created_at)}</p>
                    <p className="text-[10px] text-muted-foreground/40">{formatTime(call.created_at)}</p>
                  </div>
                  <div className="flex md:block items-center gap-2">
                    <span className="text-[10px] text-muted-foreground md:hidden">Score</span>
                    <span className={`inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-sm font-black tabular-nums ${scoreBadge(call.overall_score)}`}>
                      {call.overall_score}
                    </span>
                  </div>
                  <div className="hidden md:block"><p className={`text-sm font-bold tabular-nums ${scoreColor(call.objection_handling_score)}`}>{call.objection_handling_score}</p></div>
                  <div className="hidden md:block"><p className={`text-sm font-bold tabular-nums ${scoreColor(call.confidence_score)}`}>{call.confidence_score}</p></div>
                  <div className="hidden md:block"><p className={`text-sm font-bold tabular-nums ${scoreColor(call.clarity_score)}`}>{call.clarity_score}</p></div>
                  <div className="hidden md:flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    <p className="text-xs tabular-nums">{formatDuration(call.duration)}</p>
                  </div>
                  <div className="hidden md:flex items-center justify-center">
                    {call.recording_url && <span title="Recording available"><Headphones className="h-3.5 w-3.5 text-primary/50" /></span>}
                  </div>
                  <div className="hidden md:flex justify-end">
                    <Eye className="h-3.5 w-3.5 text-muted-foreground/30" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors ${p === page ? "gradient-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
                    {p}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}