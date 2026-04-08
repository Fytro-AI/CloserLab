import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Trash2, Mic, Users, Briefcase, Building,
  Target, Loader2, ChevronRight, Zap, Radio,
} from "lucide-react";
import { useCustomPersonas, CustomPersona } from "@/hooks/useCustomPersonas";
import CreatePersonaModal from "@/components/CreatePersonalModal";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

/* ── Difficulty config ── */
const DIFFICULTIES = [
  { id: "easy",      label: "Warm",      sub: "Receptive prospect",      color: "text-emerald-400" },
  { id: "medium",    label: "Guarded",   sub: "Standard resistance",     color: "text-amber-400"   },
  { id: "hard",      label: "Cold",      sub: "High skepticism",         color: "text-orange-400"  },
  { id: "nightmare", label: "Hostile",   sub: "Actively tries to hang up", color: "text-red-400"   },
];

/* ── Persona card ── */
function PersonaCard({
  persona,
  onDelete,
  onStart,
  isDeleting,
  isOwner,
}: {
  persona: CustomPersona;
  onDelete: () => void;
  onStart: () => void;
  isDeleting: boolean;
  isOwner: boolean;
}) {
  return (
    <div className="group relative flex flex-col rounded-xl border border-border bg-card transition-all duration-200 hover:border-primary/40 hover:shadow-[0_0_24px_-4px_hsl(var(--primary)/0.15)] overflow-hidden">
      {/* Top accent bar */}
      <div className="h-0.5 w-full gradient-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="flex-1 p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                persona.conversation_type === "B2B"
                  ? "bg-primary/10 border-primary/20 text-primary"
                  : "bg-accent/10 border-accent/20 text-accent"
              }`}>
                {persona.conversation_type}
              </span>
              {persona.call_goal && (
                <span className="inline-flex items-center rounded-full bg-secondary border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {persona.call_goal}
                </span>
              )}
            </div>
            <h3 className="text-base font-black text-foreground leading-tight">{persona.name}</h3>
          </div>

          {isOwner && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              disabled={isDeleting}
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-all"
            >
              {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {[
            { icon: Briefcase, value: persona.job_title },
            { icon: Building,  value: persona.industry  },
            { icon: Users,     value: persona.company_size },
            { icon: Target,    value: persona.age_range },
          ].map(({ icon: Icon, value }) => (
            <div key={value} className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
              <Icon className="h-3 w-3 flex-shrink-0 text-muted-foreground/50" />
              <span className="truncate">{value}</span>
            </div>
          ))}
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{persona.description}</p>
      </div>

      {/* Start button */}
      <button
        onClick={onStart}
        className="flex items-center justify-center gap-2 border-t border-border bg-secondary/30 py-3 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary/10 hover:text-primary transition-colors"
      >
        <Mic className="h-3.5 w-3.5" />
        Start Voice Call
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ── Difficulty picker modal ── */
function DifficultyModal({
  persona,
  onClose,
  onConfirm,
}: {
  persona: CustomPersona;
  onClose: () => void;
  onConfirm: (difficulty: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm mx-4 rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="border-b border-border px-6 py-5 space-y-1">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary animate-pulse" />
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Voice Call</p>
          </div>
          <h2 className="text-lg font-black text-foreground">{persona.name}</h2>
          <p className="text-xs text-muted-foreground">{persona.job_title} · {persona.industry}</p>
        </div>

        {/* Difficulty */}
        <div className="p-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Prospect Mood</p>
          <div className="grid grid-cols-2 gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelected(d.id)}
                className={`rounded-lg border p-3 text-left transition-all ${
                  selected === d.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-secondary/30 hover:border-primary/30"
                }`}
              >
                <div className={`text-sm font-black ${d.color}`}>{d.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{d.sub}</div>
              </button>
            ))}
          </div>

          <div className="pt-2 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-border py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary/50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => selected && onConfirm(selected)}
              disabled={!selected}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg gradient-primary py-2.5 text-sm font-black text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Mic className="h-4 w-4" />
              Call Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main ── */
export default function Scenarios() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { personas, loading, createPersona, deletePersona } = useCustomPersonas();
  const { toast } = useToast();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [launchingPersona, setLaunchingPersona] = useState<CustomPersona | null>(null);

  const handleCreate = async (form: any) => {
    try {
      await createPersona(form);
      toast({ title: "Roleplay AI created", description: `${form.name} is ready.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const handleDelete = async (persona: CustomPersona) => {
    if (persona.created_by !== user?.id) return;
    setDeletingId(persona.id);
    try {
      await deletePersona(persona.id);
      toast({ title: "Deleted", description: `${persona.name} removed.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleConfirmCall = (difficulty: string) => {
    if (!launchingPersona) return;
    const p = launchingPersona;

    if (!profile?.is_pro) {
      toast({
        title: "Pro required",
        description: "Voice calls are a Pro feature. Upgrade to unlock.",
        variant: "destructive",
      });
      setLaunchingPersona(null);
      return;
    }

    navigate("/simulation", {
      state: {
        industry: p.industry,
        difficulty,
        persona: "custom",
        voiceMode: true,
        prospectName: p.name,
        prospectCompany: `${p.company_size} ${p.industry} company`,
        customIndustryDescription: `You are ${p.name}, a ${p.age_range} year old ${p.job_title} in the ${p.industry} industry at a ${p.company_size} company. Conversation type: ${p.conversation_type}. ${p.description}. The seller's product/service: ${p.product_details}. ${p.call_goal ? `Call goal: ${p.call_goal}.` : ""}`,
      },
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Training Roster
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Build custom AI prospects and practice with live voice calls.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg gradient-primary px-4 py-2.5 text-sm font-black uppercase tracking-wider text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          New Prospect
        </button>
      </div>

      {/* Pro notice for voice */}
      {!profile?.is_pro && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
          <Mic className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-bold text-amber-400">Voice calls require Pro. </span>
            <span className="text-muted-foreground">
              Build your roster now — upgrade whenever you're ready to start calling.{" "}
            </span>
            <button
              onClick={() => navigate("/pricing")}
              className="font-semibold text-primary hover:underline"
            >
              View plans →
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
        </div>
      ) : personas.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 py-24 text-center space-y-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card">
            <Users className="h-6 w-6 text-muted-foreground/30" />
          </div>
          <div>
            <p className="font-black text-foreground">No prospects yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
              Create an AI prospect modelled on your real ICP and start calling.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-lg gradient-primary px-6 py-3 text-sm font-black uppercase tracking-wider text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Zap className="h-4 w-4" />
            Create First Prospect
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {personas.map((persona) => (
            <PersonaCard
              key={persona.id}
              persona={persona}
              isOwner={persona.created_by === user?.id}
              isDeleting={deletingId === persona.id}
              onDelete={() => handleDelete(persona)}
              onStart={() => setLaunchingPersona(persona)}
            />
          ))}

          {/* Add more card */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/30 p-8 text-muted-foreground/50 hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-all min-h-[200px]"
          >
            <Plus className="h-6 w-6" />
            <span className="text-sm font-semibold">Add prospect</span>
          </button>
        </div>
      )}

      {/* Modals */}
      <CreatePersonaModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
      />

      {launchingPersona && (
        <DifficultyModal
          persona={launchingPersona}
          onClose={() => setLaunchingPersona(null)}
          onConfirm={handleConfirmCall}
        />
      )}
    </div>
  );
}