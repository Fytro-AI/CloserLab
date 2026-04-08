import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Users, ArrowRight, Loader2 } from "lucide-react";
import { useTeam } from "@/hooks/useTeam";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TEAM_SIZES = [
  { value: "1-5", label: "1–5 people" },
  { value: "6-10", label: "6–10 people" },
  { value: "11-20", label: "11–20 people" },
  { value: "21-50", label: "21–50 people" },
  { value: "51-100", label: "51–100 people" },
  { value: "100+", label: "100+ people" },
];

export default function CreateTeam() {
  const navigate = useNavigate();
  const { createTeam } = useTeam();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !teamSize) return;

    setSubmitting(true);
    try {
      await createTeam(name.trim(), teamSize);
      toast({ title: "Team created", description: `Welcome to ${name.trim()}!` });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Could not create team", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md space-y-8 animate-slide-up">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl gradient-primary">
            <Building2 className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            Set Up Your Workspace
          </h1>
          <p className="text-muted-foreground">
            Create your team to start training with CloserLab.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Team Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Sales Team"
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Team Size</label>
            <Select value={teamSize} onValueChange={setTeamSize} required>
              <SelectTrigger>
                <SelectValue placeholder="How many people on your team?" />
              </SelectTrigger>
              <SelectContent>
                {TEAM_SIZES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {s.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <button
            type="submit"
            disabled={submitting || !name.trim() || !teamSize}
            className="w-full flex items-center justify-center gap-2 rounded-lg gradient-primary py-3.5 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Continue <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
