import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: boolean;
}

export default function StatCard({ label, value, icon: Icon, accent }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 card-glow-hover transition-all">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-md ${accent ? "gradient-primary" : "bg-secondary"}`}>
          <Icon className={`h-5 w-5 ${accent ? "text-primary-foreground" : "text-muted-foreground"}`} />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-2xl font-black text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}
