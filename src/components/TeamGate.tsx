import { useState } from "react";
import { Building2, Users, ArrowRight, Loader2, ChevronDown } from "lucide-react";
import { useTeam } from "@/hooks/useTeam";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "react-router-dom";

// Values must match check constraint: size = ANY (ARRAY['1-5','5-10','10-20','20-50'])
const TEAM_SIZES = [
  { value: "1-5",   label: "1–5 people"     },
  { value: "5-10",  label: "5–10 people"    },
  { value: "10-20", label: "10–20 people"   },
  { value: "20-50", label: "20–50 people"   },
  { value: "50-100",label: "50-100 people"  },
  { value: "100+",  label: "100+ people"    },
];

export default function TeamGate({ children }: { children: React.ReactNode }) {
  const { hasTeam, loading, createTeam } = useTeam();
  const location = useLocation();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [size, setSize] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (loading || hasTeam === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  if (location.pathname.startsWith("/join/")) {
    return <>{children}</>;
  }

  if (hasTeam) return <>{children}</>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !size) return;
    setSubmitting(true);
    try {
      await createTeam(name.trim(), size);
      toast({ title: "Workspace created", description: `Welcome to ${name.trim()}!` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Could not create workspace", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8 animate-slide-up">

        <div className="text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-[0_0_32px_-4px_hsl(var(--primary)/0.4)]">
            <Building2 className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Set up your workspace
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto leading-relaxed">
              CloserLab is built for sales teams. Name your workspace — even if it's just you.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Workspace name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Sales, My Practice, Just Me"
              maxLength={100}
              required
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Team size
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className={`w-full flex items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm transition-colors ${
                  open ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"
                }`}
              >
                <span className={size ? "text-foreground" : "text-muted-foreground/40"}>
                  {TEAM_SIZES.find((s) => s.value === size)?.label ?? "Select team size"}
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground/50 transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
              {open && (
                <div className="absolute z-50 mt-1.5 w-full rounded-lg border border-border bg-card shadow-xl overflow-hidden">
                  {TEAM_SIZES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => { setSize(s.value); setOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-primary/5 hover:text-primary ${
                        size === s.value ? "bg-primary/10 text-primary font-semibold" : "text-foreground"
                      }`}
                    >
                      <Users className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !name.trim() || !size}
            className="w-full flex items-center justify-center gap-2 rounded-lg gradient-primary py-3.5 text-sm font-black uppercase tracking-wider text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>Enter CloserLab <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground/50">
          You can invite teammates later from the Team page.
        </p>
      </div>
    </div>
  );
}