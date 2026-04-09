import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getRank, getNextRank, RANKS } from "@/lib/game-data";
import {
  Zap, Flame, Shield, Crown, LogOut, ChevronRight,
  Mic, MessageSquare, TrendingUp, Calendar, Phone,
} from "lucide-react";

export default function Account() {
  const { profile, loading } = useProfile();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleManageBilling = async () => {
    const { data } = await supabase.functions.invoke("customer-portal");
    if (data?.url) window.location.href = data.url;
  };

  const handleUpgrade = () => navigate("/pricing");

  if (loading || !profile) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <Zap className="h-6 w-6 text-primary animate-pulse" />
      </div>
    );
  }

  const rank = getRank(profile.xp);
  const nextRank = getNextRank(profile.xp);
  const xpToNext = nextRank ? nextRank.minXP - profile.xp : 0;
  const xpProgress = nextRank
    ? ((profile.xp - (RANKS.find(r => r.name === rank.name)?.minXP ?? 0)) /
       (nextRank.minXP - (RANKS.find(r => r.name === rank.name)?.minXP ?? 0))) * 100
    : 100;

  const tier = profile.subscription_tier;
  const isPro = profile.is_pro;
  const isStarter = tier === "starter";
  const isFree = !isPro && !isStarter;

  const tierLabel = isPro ? "Pro" : isStarter ? "Starter" : "Free";
  const tierColor = isPro ? "text-primary" : isStarter ? "text-accent" : "text-muted-foreground";
  const tierBg = isPro ? "bg-primary/10 border-primary/30" : isStarter ? "bg-accent/10 border-accent/30" : "bg-secondary border-border";

  return (
    <div className="container mx-auto max-w-xl px-4 py-8 space-y-4 animate-slide-up">

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-black text-foreground tracking-tight">Account</h1>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </div>

      {/* Rank card */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4 card-glow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{rank.icon}</span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Current Rank</p>
              <p className="text-2xl font-black text-foreground">{rank.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Total XP</p>
            <p className="text-2xl font-black text-primary">{profile.xp.toLocaleString()}</p>
          </div>
        </div>

        {nextRank && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{xpToNext.toLocaleString()} XP to {nextRank.name} {nextRank.icon}</span>
              <span>{Math.round(xpProgress)}%</span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full gradient-primary transition-all duration-700"
                style={{ width: `${Math.min(xpProgress, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Phone, label: "Calls", value: profile.calls_completed },
          { icon: Flame, label: "Streak", value: `${profile.streak}d` },
          { icon: TrendingUp, label: "Level", value: profile.level },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 text-center space-y-1">
            <Icon className="h-4 w-4 text-muted-foreground mx-auto" />
            <p className="text-xl font-black text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">{label}</p>
          </div>
        ))}
      </div>

      {/* Plan */}
      <div className={`rounded-xl border p-5 space-y-4 ${tierBg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isPro ? <Crown className="h-5 w-5 text-primary" /> : <Shield className="h-5 w-5 text-muted-foreground" />}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Current Plan</p>
              <p className={`text-lg font-black ${tierColor}`}>{tierLabel}</p>
            </div>
          </div>
          {isPro && (
            <div className="flex items-center gap-1 rounded-full gradient-primary px-3 py-1 text-xs font-bold text-primary-foreground uppercase tracking-wider">
              <Crown className="h-3 w-3" /> Pro
            </div>
          )}
        </div>

        {/* Plan features */}
        <div className="space-y-2 text-sm text-muted-foreground">
          {isPro && (
            <>
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-primary" />
                <span>Realtime AI voice calls · 180 min/month</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span>Unlimited text simulations</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span>Weekly coaching reports</span>
              </div>
            </>
          )}
          {isStarter && (
            <>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-accent" />
                <span>Unlimited text simulations</span>
              </div>
              <div className="flex items-center gap-2 opacity-50">
                <Mic className="h-4 w-4" />
                <span>Voice calls - upgrade to Pro</span>
              </div>
            </>
          )}
          {isFree && (
            <>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span>3 simulations / week</span>
              </div>
              <div className="flex items-center gap-2 opacity-50">
                <Mic className="h-4 w-4" />
                <span>Voice calls - upgrade to Pro</span>
              </div>
            </>
          )}
        </div>

        {/* CTA */}
        {isPro || isStarter ? (
          <button
            onClick={handleManageBilling}
            className="w-full flex items-center justify-between rounded-lg border border-border bg-background/50 px-4 py-3 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
          >
            Manage Subscription
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ) : (
          <button
            onClick={handleUpgrade}
            className="w-full rounded-lg gradient-primary py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Zap className="h-4 w-4" /> Upgrade to Pro
          </button>
        )}
      </div>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-destructive/30 hover:text-destructive transition-all"
      >
        <LogOut className="h-4 w-4" />
        {signingOut ? "Signing out..." : "Sign Out"}
      </button>

    </div>
  );
}