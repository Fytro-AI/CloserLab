import { useState, useEffect } from "react";
import { Shield, Send, Loader2, Sparkles, Lock, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

interface Objection {
  id: string;
  objection_text: string;
  buyer_context: string | null;
  user_response: string | null;
  ai_feedback: string | null;
  score: number | null;
  objection_date: string;
}

interface DailyData {
  objections: Objection[];
  used: number;
  limit: number;
  is_pro: boolean;
}

export default function DailyObjections() {
  const { profile } = useProfile();
  const [data, setData] = useState<DailyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [responding, setResponding] = useState(false);
  const [activeObjection, setActiveObjection] = useState<Objection | null>(null);
  const [userInput, setUserInput] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = async () => {
    const { data: result } = await supabase.functions.invoke("daily-objection", {
      body: { action: "get" },
    });
    if (result) setData(result);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const generateObjection = async () => {
    setGenerating(true);
    const { data: result, error } = await supabase.functions.invoke("daily-objection", {
      body: { action: "generate" },
    });
    if (result?.objection) {
      setActiveObjection(result.objection);
      setUserInput("");
      await fetchData();
    }
    setGenerating(false);
  };

  const submitResponse = async () => {
    if (!activeObjection || !userInput.trim() || responding) return;
    setResponding(true);
    const { data: result } = await supabase.functions.invoke("daily-objection", {
      body: { action: "respond", objection_id: activeObjection.id, response: userInput.trim() },
    });
    if (result) {
      setActiveObjection({
        ...activeObjection,
        user_response: userInput.trim(),
        ai_feedback: result.feedback,
        score: result.score,
      });
      await fetchData();
    }
    setResponding(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-accent";
    if (score >= 40) return "text-warning";
    return "text-destructive";
  };

  const remaining = data ? data.limit - data.used : 0;
  const completedObjections = data?.objections?.filter((o) => o.user_response) ?? [];
  const hasActiveUnanswered = activeObjection && !activeObjection.user_response;

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="animate-pulse text-muted-foreground text-sm">Loading objections...</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Daily Objections</h2>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            {data?.used ?? 0}/{data?.limit ?? 0} used
          </span>
          {!data?.is_pro && (
            <span className="flex items-center gap-1 text-xs text-accent">
              <Lock className="h-3 w-3" />
              <span>Pro: 5/day</span>
            </span>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Handle real buyer objections. Write the best response you can — AI will score you.
      </p>

      {/* Active objection card */}
      {hasActiveUnanswered ? (
        <div className="space-y-3 rounded-md border border-primary/20 bg-primary/5 p-4">
          <div className="text-xs text-muted-foreground italic">{activeObjection.buyer_context}</div>
          <div className="text-sm font-medium text-foreground">
            "{activeObjection.objection_text}"
          </div>
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type your response to the buyer..."
            rows={3}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
          <div className="flex justify-end">
            <button
              onClick={submitResponse}
              disabled={responding || userInput.trim().length < 5}
              className="flex items-center gap-1.5 rounded-md gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {responding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit
            </button>
          </div>
        </div>
      ) : activeObjection?.user_response ? (
        /* Just-answered feedback */
        <div className="space-y-3 rounded-md border border-border bg-secondary/30 p-4">
          <div className="text-xs text-muted-foreground italic">{activeObjection.buyer_context}</div>
          <div className="text-sm text-foreground">
            "{activeObjection.objection_text}"
          </div>
          <div className="rounded-md bg-background p-3 text-sm text-muted-foreground">
            <span className="text-foreground font-medium">Your response: </span>
            {activeObjection.user_response}
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-2xl font-black font-mono ${getScoreColor(activeObjection.score ?? 0)}`}>
              {activeObjection.score}
            </span>
            <span className="text-sm text-muted-foreground flex-1">{activeObjection.ai_feedback}</span>
          </div>
        </div>
      ) : null}

      {/* Generate button */}
      {!hasActiveUnanswered && remaining > 0 && (
        <button
          onClick={generateObjection}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {generating ? "Generating..." : `New Objection (${remaining} left today)`}
        </button>
      )}

      {!hasActiveUnanswered && remaining <= 0 && (
        <div className="text-center py-3 text-sm text-muted-foreground">
          {data?.is_pro ? "You've completed all 5 objections today. Come back tomorrow!" : "Daily objection used. Upgrade to Pro for 5/day."}
        </div>
      )}

      {/* Past objections */}
      {completedObjections.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Today's Results</h3>
          {completedObjections.map((obj) => (
            <button
              key={obj.id}
              onClick={() => setExpandedId(expandedId === obj.id ? null : obj.id)}
              className="w-full text-left rounded-md border border-border bg-background p-3 hover:bg-secondary/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground truncate flex-1 mr-2">
                  "{obj.objection_text.slice(0, 60)}…"
                </span>
                <div className="flex items-center gap-2">
                  <span className={`font-mono font-bold text-sm ${getScoreColor(obj.score ?? 0)}`}>
                    {obj.score}
                  </span>
                  {expandedId === obj.id ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
              {expandedId === obj.id && (
                <div className="mt-3 space-y-2 text-sm" onClick={(e) => e.stopPropagation()}>
                  <div className="text-xs text-muted-foreground italic">{obj.buyer_context}</div>
                  <div className="text-muted-foreground">
                    <span className="text-foreground font-medium">You said: </span>
                    {obj.user_response}
                  </div>
                  <div className="text-muted-foreground">{obj.ai_feedback}</div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
