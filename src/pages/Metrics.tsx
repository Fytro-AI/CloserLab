import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTeamContext } from "@/hooks/useTeamContext";
import { supabase } from "@/integrations/supabase/client";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3, TrendingUp, Users } from "lucide-react";

const METRIC_OPTIONS = [
  { key: "overall_score",            label: "AI Score"           },
  { key: "closing_score",            label: "Close Rate"         },
  { key: "objection_handling_score", label: "Objection Handling" },
  { key: "confidence_score",         label: "Confidence"         },
  { key: "clarity_score",            label: "Clarity"            },
] as const;

type MetricKey = (typeof METRIC_OPTIONS)[number]["key"];

interface DayData { date: string; value: number; count: number }

export default function Metrics() {
  const { user } = useAuth();
  const { memberIds, isTeamView, loading: teamLoading } = useTeamContext();
  const [metric, setMetric] = useState<MetricKey>("overall_score");
  const [chartData, setChartData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalSessions: 0, avgScore: 0, totalReps: 0 });

  useEffect(() => {
    if (!user || teamLoading || memberIds.length === 0) return;
    loadData();
  }, [user, metric, memberIds.join(","), teamLoading]);

  async function loadData() {
    setLoading(true);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Build query scoped to memberIds
    const buildQuery = (select: string) => {
      let q = supabase.from("call_history").select(select);
      if (memberIds.length === 1) {
        q = q.eq("user_id", memberIds[0]);
      } else {
        q = q.in("user_id", memberIds);
      }
      return q;
    };

    const { data: recentCalls } = await buildQuery(
      "created_at, overall_score, closing_score, objection_handling_score, confidence_score, clarity_score"
    )
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    const { data: allCalls } = await buildQuery("overall_score");

    // Build last-7-days chart
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    });

    const dayMap = new Map<string, { total: number; count: number }>();
    last7.forEach((day) => dayMap.set(day, { total: 0, count: 0 }));

    (recentCalls || []).forEach((c: any) => {
      const day = new Date(c.created_at).toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric",
      });
      const existing = dayMap.get(day) || { total: 0, count: 0 };
      existing.total += c[metric] || 0;
      existing.count += 1;
      dayMap.set(day, existing);
    });

    setChartData(
      last7.map((day) => {
        const d = dayMap.get(day)!;
        return {
          date: day.split(", ")[0] || day,
          value: d.count > 0 ? Math.round(d.total / d.count) : 0,
          count: d.count,
        };
      })
    );

    const total = allCalls?.length ?? 0;
    const avg = total > 0
      ? Math.round((allCalls || []).reduce((s, c: any) => s + (c.overall_score || 0), 0) / total)
      : 0;

    setStats({
      totalSessions: total,
      avgScore: avg,
      totalReps: memberIds.length,
    });

    setLoading(false);
  }

  const chartConfig = {
    value: {
      label: METRIC_OPTIONS.find((m) => m.key === metric)?.label ?? "Score",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 animate-slide-up">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-black tracking-tight text-foreground">Metrics</h1>
          {isTeamView && (
            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary border border-primary/30 bg-primary/10 rounded-full px-2 py-0.5">
              <Users className="h-3 w-3" /> Team
            </span>
          )}
        </div>
        <p className="text-muted-foreground">
          {isTeamView
            ? `Performance trends across your ${memberIds.length} reps.`
            : "Track your performance trends over time."}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: BarChart3, value: stats.totalSessions, label: isTeamView ? "Team Sessions" : "Total Sessions" },
          { icon: TrendingUp, value: `${stats.avgScore}`, label: isTeamView ? "Team Avg Score" : "Avg Score" },
          { icon: Users, value: stats.totalReps, label: "Active Reps" },
        ].map(({ icon: Icon, value, label }) => (
          <div key={label} className="flex items-center gap-4 rounded-lg border border-border bg-card p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-black text-foreground">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">
            {isTeamView ? "Team Score Trend" : "Score Trend"} − last 7 days
          </h2>
          <Select value={metric} onValueChange={(v) => setMetric(v as MetricKey)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METRIC_OPTIONS.map((m) => (
                <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground text-sm animate-pulse">
            Loading…
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#metricGrad)" />
            </AreaChart>
          </ChartContainer>
        )}
      </div>
    </div>
  );
}