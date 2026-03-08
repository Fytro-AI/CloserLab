interface SkillBarProps {
  label: string;
  value: number;
  maxValue?: number;
}

export default function SkillBar({ label, value, maxValue = 100 }: SkillBarProps) {
  const pct = Math.min((value / maxValue) * 100, 100);
  const color =
    pct >= 80 ? "bg-success" : pct >= 60 ? "bg-primary" : pct >= 40 ? "bg-accent" : "bg-danger";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="font-mono text-muted-foreground">{value}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-secondary">
        <div
          className={`h-full rounded-full ${color} transition-all duration-1000 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
