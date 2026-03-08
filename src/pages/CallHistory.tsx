import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PERSONAS, INDUSTRIES, DIFFICULTIES } from "@/lib/game-data";
import { Eye, Zap, Calendar, Clock } from "lucide-react";

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
}

export default function CallHistory() {
  const { user } = useAuth();
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("call_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setCalls((data as CallRecord[]) || []);
        setLoading(false);
      });
  }, [user]);

  const getPersonaLabel = (id: string) => PERSONAS.find((p) => p.id === id)?.label || id;
  const getIndustryLabel = (id: string) => INDUSTRIES.find((i) => i.id === id)?.label || id;
  const getDiffLabel = (id: string) => DIFFICULTIES.find((d) => d.id === id) || null;
  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  if (selectedCall) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8 space-y-6 animate-slide-up">
        <button onClick={() => setSelectedCall(null)} className="text-sm text-primary hover:underline">
          ← Back to history
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground">Call Replay</h1>
            <p className="text-sm text-muted-foreground">
              {getIndustryLabel(selectedCall.industry)} • {getPersonaLabel(selectedCall.persona)} • {formatDate(selectedCall.created_at)}
            </p>
          </div>
          <div className="text-3xl font-black text-primary">{selectedCall.overall_score}</div>
        </div>

        {/* Transcript */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3 max-h-96 overflow-y-auto">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Transcript</h3>
          {(selectedCall.transcript as any[]).map((msg: any, i: number) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "gradient-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {/* Scores */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Breakdown</h3>
          {[
            { label: "Confidence", value: selectedCall.confidence_score },
            { label: "Objection Handling", value: selectedCall.objection_handling_score },
            { label: "Clarity", value: selectedCall.clarity_score },
            { label: "Closing", value: selectedCall.closing_score },
          ].map((s) => (
            <div key={s.label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{s.label}</span>
              <span className="font-mono font-bold text-foreground">{s.value}</span>
            </div>
          ))}
        </div>

        {/* Tip */}
        {selectedCall.improvement_tip && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-foreground">{selectedCall.improvement_tip}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 space-y-8 animate-slide-up">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Call History</h1>
        <p className="text-muted-foreground">Every rep counts. Review your past battles.</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground animate-pulse">Loading history...</div>
      ) : calls.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <p className="text-muted-foreground">No calls yet. Get in the arena.</p>
          <Link to="/scenarios" className="text-primary font-semibold hover:underline">
            Start training →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {calls.map((call) => {
            const diff = getDiffLabel(call.difficulty);
            return (
              <button
                key={call.id}
                onClick={() => setSelectedCall(call)}
                className="w-full rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-primary/30 card-glow-hover"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{getIndustryLabel(call.industry)}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{getPersonaLabel(call.persona)}</span>
                      {diff && (
                        <span className={`text-xs font-semibold ${diff.color}`}>{diff.label}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(call.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(call.duration)}
                      </span>
                      <span className="flex items-center gap-1 text-accent">
                        <Zap className="h-3 w-3" />
                        +{call.xp_earned} XP
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-black text-primary">{call.overall_score}</div>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
