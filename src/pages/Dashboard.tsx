import { Link } from "react-router-dom";
import { Zap, Flame, Phone, TrendingUp, ArrowRight, LogOut } from "lucide-react";
import { getRank, getNextRank } from "@/lib/game-data";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import StatCard from "@/components/StatCard";
import SkillBar from "@/components/SkillBar";
import DailyObjections from "@/components/DailyObjections";

export default function Dashboard() {
  const { profile, loading } = useProfile();
  const { signOut } = useAuth();

  if (loading || !profile) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  const rank = getRank(profile.xp);
  const nextRank = getNextRank(profile.xp);
  const progress = nextRank
    ? ((profile.xp - rank.minXP) / (nextRank.minXP - rank.minXP)) * 100
    : 100;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 animate-slide-up">
      {/* Hero */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            Welcome back, <span className="text-primary text-glow">{profile.name}</span>.
          </h1>
          <p className="text-muted-foreground">
            You're a <span className="font-semibold text-foreground">{rank.icon} {rank.name}</span>.
            {nextRank
              ? ` ${nextRank.minXP - profile.xp} XP until your next rank.`
              : " You've reached the top. Stay sharp."}
          </p>
        </div>
        <button onClick={signOut} className="text-muted-foreground hover:text-foreground transition-colors p-2">
          <LogOut className="h-5 w-5" />
        </button>
      </div>

      {/* Rank Progress */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-foreground">{rank.icon} {rank.name}</span>
          {nextRank && (
            <span className="text-muted-foreground">
              {nextRank.icon} {nextRank.name}
            </span>
          )}
        </div>
        <div className="h-3 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full gradient-primary transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground font-mono">{profile.xp} / {nextRank?.minXP ?? "MAX"} XP</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="XP Points" value={profile.xp} icon={Zap} accent />
        <StatCard label="Weekly Streak" value={`${profile.streak} 🔥`} icon={Flame} />
        <StatCard label="Calls Done" value={profile.calls_completed} icon={Phone} />
        <StatCard label="Level" value={profile.level} icon={TrendingUp} />
      </div>

      {/* Skills */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-bold text-foreground">Skill Breakdown</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <SkillBar label="Objection Handling" value={profile.skill_objection_handling} />
          <SkillBar label="Confidence" value={profile.skill_confidence} />
          <SkillBar label="Clarity" value={profile.skill_clarity} />
          <SkillBar label="Closing" value={profile.skill_closing} />
        </div>
      </div>

      {/* Daily Objections */}
      <DailyObjections />

      {/* CTAs */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link
          to="/scenarios"
          className="group flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-6 transition-all hover:border-primary/60 hover:bg-primary/10 card-glow-hover"
        >
          <div>
            <h3 className="text-xl font-bold text-foreground">Ready to train?</h3>
            <p className="text-muted-foreground">Your next deal won't close itself.</p>
          </div>
          <ArrowRight className="h-6 w-6 text-primary transition-transform group-hover:translate-x-1" />
        </Link>
        <Link
          to="/challenges"
          className="group flex items-center justify-between rounded-lg border border-accent/30 bg-accent/5 p-6 transition-all hover:border-accent/60 hover:bg-accent/10 card-glow-hover"
        >
          <div>
            <h3 className="text-xl font-bold text-foreground">⚔️ Challenge Drills</h3>
            <p className="text-muted-foreground">Targeted training for your weakest skills.</p>
          </div>
          <ArrowRight className="h-6 w-6 text-accent transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
