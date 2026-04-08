import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";

const METRICS = [
  { key: "overall_score", label: "AI Score" },
  { key: "closing_score", label: "Closing" },
  { key: "objection_handling_score", label: "Objection Handling" },
  { key: "confidence_score", label: "Confidence" },
  { key: "clarity_score", label: "Clarity" },
] as const;

type MetricKey = (typeof METRICS)[number]["key"];

interface DataPoint {
  date: string;
  value: number;
}

interface SkillGraphProps {
  /** When provided, aggregates data across all these user IDs (team view) */
  userIds?: string[];
  isTeamView?: boolean;
}

export default function SkillGraph({ userIds, isTeamView }: SkillGraphProps) {
  const { user } = useAuth();
  const [active, setActive] = useState<MetricKey>("overall_score");
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const ids = userIds && userIds.length > 0 ? userIds : [user.id];

    let query = supabase
      .from("call_history")
      .select(
        "created_at, overall_score, closing_score, objection_handling_score, confidence_score, clarity_score"
      )
      .order("created_at", { ascending: false })
      .limit(isTeamView ? 200 : 50);

    if (ids.length === 1) {
      query = query.eq("user_id", ids[0]);
    } else {
      query = query.in("user_id", ids);
    }

    query.then(({ data: calls }) => {
      if (calls) {
        if (isTeamView) {
          // Group by date, average across team members
          const byDate = new Map<string, { total: number; count: number }>();
          const ordered = [...calls].reverse();
          ordered.forEach((c: any) => {
            const dateKey = new Date(c.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
            const existing = byDate.get(dateKey) ?? { total: 0, count: 0 };
            existing.total += c[active] ?? 0;
            existing.count += 1;
            byDate.set(dateKey, existing);
          });
          // Keep last 30 unique dates
          const entries = Array.from(byDate.entries()).slice(-30);
          setData(
            entries.map(([date, { total, count }]) => ({
              date,
              value: Math.round(total / count),
            }))
          );
        } else {
          const ordered = [...calls].reverse();
          setData(
            ordered.map((c: any) => ({
              date: new Date(c.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
              value: c[active],
            }))
          );
        }
      }
      setLoading(false);
    });
  }, [user, active, userIds?.join(","), isTeamView]);

  const chartConfig = {
    value: {
      label: METRICS.find((m) => m.key === active)?.label || "Score",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Performance</h2>
          {isTeamView && (
            <p className="text-xs text-muted-foreground">Team average · all members</p>
          )}
        </div>
      </div>

      {/* Pills */}
      <div className="flex flex-wrap gap-1.5">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setActive(m.key)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              active === m.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground text-sm animate-pulse">
          Loading...
        </div>
      ) : data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
          {isTeamView
            ? "No team calls yet. Get your reps training."
            : "Complete a training session to see your performance graph."}
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="skillGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#skillGrad)"
            />
          </AreaChart>
        </ChartContainer>
      )}
    </div>
  );
}