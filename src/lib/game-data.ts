export const RANKS = [
  { name: "Rookie", minXP: 0, icon: "🟢" },
  { name: "Setter", minXP: 500, icon: "🔵" },
  { name: "Closer", minXP: 1500, icon: "🟣" },
  { name: "Shark", minXP: 3500, icon: "🔴" },
  { name: "Wolf", minXP: 7000, icon: "🐺" },
  { name: "Apex", minXP: 12000, icon: "🦅" },
  { name: "Titan", minXP: 20000, icon: "⚡" },
  { name: "Phantom", minXP: 35000, icon: "👻" },
  { name: "Legend", minXP: 55000, icon: "🔱" },
  { name: "Godfather", minXP: 100000, icon: "👑" },
] as const;

export const INDUSTRIES = [
  { id: "saas", label: "SaaS", icon: "💻", description: "Sell software solutions" },
  { id: "macro-intelligence", label: "Macro Intelligence", icon: "📊", description: "Financial data & analytics" },
  { id: "real-estate", label: "Real Estate", icon: "🏠", description: "Property & investment sales" },
  { id: "recruiting", label: "Recruiting", icon: "🤝", description: "Talent & staffing services" },
  { id: "consulting", label: "Consulting", icon: "🧠", description: "Strategy & advisory" },
  { id: "ecommerce", label: "E-commerce", icon: "🛒", description: "Online retail deals" },
  { id: "agency", label: "Marketing Agency", icon: "📈", description: "Agency retainers" },
  { id: "coaching", label: "Coaching", icon: "🎯", description: "High-ticket coaching" },
  { id: "plumbing", label: "Plumbing", icon: "🔧", description: "Home services sales" },
  { id: "healthcare", label: "Healthcare", icon: "🏥", description: "Medical & clinic sales" },
] as const;

export const DIFFICULTIES = [
  { id: "easy", label: "Easy", color: "text-success", xpMultiplier: 1, minXP: 0 },
  { id: "medium", label: "Medium", color: "text-accent", xpMultiplier: 1.5, minXP: 500 },
  { id: "hard", label: "Hard", color: "text-danger", xpMultiplier: 2, minXP: 1500 },
  { id: "nightmare", label: "Nightmare", color: "text-destructive", xpMultiplier: 3, minXP: 3500 },
] as const;

export const PERSONAS = [
  { id: "skeptical", label: "Nice but Skeptical", icon: "🤔", description: "Polite but doubts everything" },
  { id: "aggressive", label: "Aggressive", icon: "😤", description: "Pushes back hard on everything" },
  { id: "distracted", label: "Distracted", icon: "📱", description: "Barely paying attention" },
  { id: "budget", label: "Budget-Conscious", icon: "💰", description: "Everything is too expensive" },
  { id: "time-starved", label: "Time-Starved", icon: "⏰", description: "Needs to go in 5 minutes" },
] as const;

export function getRank(xp: number) {
  let rank: (typeof RANKS)[number] = RANKS[0];
  for (const r of RANKS) {
    if (xp >= r.minXP) rank = r;
  }
  return rank;
}

export function getNextRank(xp: number) {
  for (const r of RANKS) {
    if (xp < r.minXP) return r;
  }
  return null;
}

export function calculateXP(
  baseScore: number,
  difficulty: string,
  streak: number
): number {
  if (baseScore < 40) return 0;
  const diff = DIFFICULTIES.find((d) => d.id === difficulty);
  const multiplier = diff?.xpMultiplier ?? 1;
  let xp = Math.floor(baseScore * 1.5 * multiplier);
  if (baseScore >= 80) xp = Math.floor(xp * 1.25);
  const streakBonus = 1 + Math.min(streak, 10) * 0.05;
  xp = Math.floor(xp * streakBonus);
  return xp;
}

export function calculateLevel(xp: number): number {
  return Math.floor(xp / 200) + 1;
}
