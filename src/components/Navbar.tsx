import { Link, useLocation } from "react-router-dom";
import { Zap, Target, Trophy, CreditCard, History } from "lucide-react";
import { getRank } from "@/lib/game-data";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: Target },
  { path: "/scenarios", label: "Train", icon: Zap },
  { path: "/history", label: "History", icon: History },
  { path: "/leaderboard", label: "Ranks", icon: Trophy },
  { path: "/pricing", label: "Pro", icon: CreditCard },
];

export default function Navbar() {
  const location = useLocation();
  const { user } = useAuth();
  const { profile } = useProfile();

  // Hide navbar on landing page and when not authenticated
  if (!user || location.pathname === "/landing") return null;

  const xp = profile?.xp ?? 0;
  const rank = getRank(xp);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md gradient-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-black tracking-tight text-foreground">
            CLOSER<span className="text-primary">LAB</span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-accent font-mono font-bold">{xp} XP</span>
          <span className="text-muted-foreground">|</span>
          <span className="text-foreground font-semibold">{rank.icon} {rank.name}</span>
        </div>
      </div>
    </nav>
  );
}
