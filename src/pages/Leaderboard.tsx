import { useEffect, useState } from "react";
import { RANKS, getRank, getNextRank } from "@/lib/game-data";
import { Trophy, Flame, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

interface LeaderboardEntry {
  rank: number;
  name: string;
  xp: number;
  title: string;
  streak: number;
  isUser?: boolean;
}

export default function Leaderboard() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [user]);

  const loadLeaderboard = async () => {
    // Query the restricted leaderboard view (not in generated types)
    const { data: profiles } = await supabase
      .rpc('get_leaderboard', { row_limit: 20 }) as { data: { name: string; xp: number; streak: number; level: number }[] | null };

    // Get current user's profile to highlight them
    let userProfile: { name: string; xp: number } | null = null;
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("name, xp")
        .eq("user_id", user.id)
        .single();
      userProfile = data;
    }

    if (profiles && profiles.length > 0) {
      const mapped: LeaderboardEntry[] = profiles.map((p, i) => ({
        rank: i + 1,
        name: p.name,
        xp: p.xp,
        title: getRank(p.xp).name,
        streak: p.streak,
        isUser: userProfile ? p.name === userProfile.name && p.xp === userProfile.xp : false,
      }));
      setEntries(mapped);
    } else {
      setEntries([]);
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 space-y-8 animate-slide-up">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Weekly Leaderboard</h1>
        <p className="text-muted-foreground">Top closers this week. Where do you stand?</p>
      </div>

      {/* Rank Ladder */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Rank Ladder</h2>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {RANKS.map((r) => {
            const userXP = profile?.xp ?? 0;
            const currentRank = getRank(userXP);
            const nextRank = getNextRank(userXP);
            const isUnlocked = userXP >= r.minXP;
            const isNext = nextRank?.name === r.name;

            if (!isUnlocked && !isNext) {
              return (
                <div key={r.name} className="flex flex-col items-center gap-1 text-center opacity-40">
                  <span className="text-xl">❓</span>
                  <span className="text-xs font-bold text-muted-foreground">???</span>
                  <span className="text-[10px] text-muted-foreground">???</span>
                </div>
              );
            }

            return (
              <div key={r.name} className={`flex flex-col items-center gap-1 text-center ${isNext ? "opacity-60" : ""}`}>
                <span className="text-xl">{isNext ? "❓" : r.icon}</span>
                <span className="text-xs font-bold text-foreground">{isNext ? "???" : r.name}</span>
                <span className="text-[10px] text-muted-foreground">{r.minXP}+ XP</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground animate-pulse">Loading rankings...</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No closers ranked yet. Be the first.</div>
        ) : (
          entries.map((entry, i) => (
            <div
              key={entry.rank}
              className={`flex items-center justify-between px-5 py-4 border-b border-border last:border-0 transition-colors ${
                entry.isUser ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-secondary/50"
              }`}
            >
              <div className="flex items-center gap-4">
                <span
                  className={`text-lg font-black w-8 ${
                    i === 0 ? "text-accent" : i === 1 ? "text-muted-foreground" : i === 2 ? "text-warning" : "text-muted-foreground"
                  }`}
                >
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${entry.rank}`}
                </span>
                <div>
                  <span className={`font-bold text-sm ${entry.isUser ? "text-primary" : "text-foreground"}`}>
                    {entry.isUser ? `${entry.name} (You)` : entry.name}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">{entry.title}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Flame className="h-3.5 w-3.5 text-accent" />
                  {entry.streak}
                </span>
                <span className="font-mono font-bold text-accent w-20 text-right">
                  {entry.xp.toLocaleString()} XP
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
