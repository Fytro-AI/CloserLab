import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  Zap, Target, Trophy, CreditCard, History,
  User2Icon, Phone, Building2, ChevronLeft, ChevronRight,
} from "lucide-react";
import { getRank } from "@/lib/game-data";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";

const SIDEBAR_WIDTH = 220;
const SIDEBAR_COLLAPSED_WIDTH = 56;

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  soon?: boolean;
}

export default function Navbar() {
  const location = useLocation();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [collapsed, setCollapsed] = useState(false);

  if (!user || location.pathname === "/landing") return null;

  const xp = profile?.xp ?? 0;
  const rank = getRank(xp);

  const NAV_ITEMS: NavItem[] = [
    { path: "/",            label: "Dashboard",  icon: Target },
    { path: "/scenarios",   label: "Train",      icon: Zap },
    { path: "/history",     label: "History",    icon: History },
    { path: "/leaderboard", label: "Ranks",      icon: Trophy },
    { path: "/pricing",     label: "Pro",        icon: CreditCard },
    { path: "/company",     label: "My Company", icon: Building2 },
    { path: "/coming-soon", label: "Live Call",  icon: Phone, soon: true },
  ];

  // Bottom tab items — show the 5 most important on mobile
  const BOTTOM_TABS: NavItem[] = [
    { path: "/",          label: "Home",    icon: Target },
    { path: "/scenarios", label: "Train",   icon: Zap },
    { path: "/leaderboard", label: "Ranks", icon: Trophy },
    { path: "/pricing",   label: "Pro",     icon: CreditCard },
    { path: "/account",   label: "Account", icon: User2Icon },
  ];

  const w = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <>
      {/* ══════════════════════════════════════
          MOBILE: top bar + bottom tab bar
          hidden on md+
      ══════════════════════════════════════ */}
      <div className="md:hidden">
        {/* Top bar */}
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-14 px-4 border-b border-border bg-background/95 backdrop-blur-xl">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md gradient-primary">
              <Zap className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-base font-black tracking-tight text-foreground">
              CLOSER<span className="text-primary">LAB</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-bold text-accent">{xp} XP</span>
            <Link to="/account" className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-base">
              {rank.icon}
            </Link>
          </div>
        </header>

        {/* Spacer so content doesn't hide under top bar */}
        <div className="h-14" />

        {/* Bottom tab bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-background/95 backdrop-blur-xl">
          {BOTTOM_TABS.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-semibold">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Spacer so content doesn't hide under bottom tab bar */}
        <div className="fixed bottom-0 left-0 right-0 h-[60px] pointer-events-none" />
      </div>

      {/* ══════════════════════════════════════
          DESKTOP: left sidebar
          hidden on mobile
      ══════════════════════════════════════ */}
      <aside
        className="hidden md:flex fixed top-0 left-0 bottom-0 z-50 flex-col border-r border-border bg-background/95 backdrop-blur-xl transition-all duration-200"
        style={{ width: w }}
      >
        {/* Logo */}
        <div className="flex items-center h-14 px-4 border-b border-border flex-shrink-0">
          {!collapsed ? (
            <Link to="/" className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-md gradient-primary flex-shrink-0">
                <Zap className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-black tracking-tight text-foreground truncate">
                CLOSER<span className="text-primary">LAB</span>
              </span>
            </Link>
          ) : (
            <Link to="/" className="flex items-center justify-center w-full">
              <div className="flex h-8 w-8 items-center justify-center rounded-md gradient-primary">
                <Zap className="h-4 w-4 text-primary-foreground" />
              </div>
            </Link>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
          {NAV_ITEMS.map(({ path, label, icon: Icon, soon }) => {
            const active = !soon && location.pathname === path;
            return (
              <Link
                key={`${path}-${label}`}
                to={path}
                title={collapsed ? label : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : soon
                    ? "text-muted-foreground/50 hover:bg-secondary/30 hover:text-muted-foreground"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="truncate flex-1">{label}</span>
                    {soon && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/40 border border-muted-foreground/20 rounded px-1 py-0.5 flex-shrink-0">
                        Soon
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User card */}
        <div className="flex-shrink-0 border-t border-border p-3 space-y-2">
          {!collapsed ? (
            <Link
              to="/account"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary flex-shrink-0 text-base">
                {rank.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground truncate">{profile?.name ?? "Closer"}</p>
                <p className="text-xs text-muted-foreground font-mono">{xp.toLocaleString()} XP · {rank.name}</p>
              </div>
              <User2Icon className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
            </Link>
          ) : (
            <Link to="/account" title="Account" className="flex items-center justify-center w-full py-1 rounded-lg hover:bg-secondary/50 transition-colors">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-base">
                {rank.icon}
              </div>
            </Link>
          )}

          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex items-center justify-center w-full rounded-lg py-1.5 text-muted-foreground/40 hover:text-muted-foreground hover:bg-secondary/50 transition-colors"
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>
      </aside>

      {/* Desktop spacer — pushes page content right of sidebar */}
      <div className="hidden md:block flex-shrink-0 transition-all duration-200" style={{ width: w }} />
    </>
  );
}

export const SIDEBAR_W = SIDEBAR_WIDTH;
export const SIDEBAR_COLLAPSED_W = SIDEBAR_COLLAPSED_WIDTH;