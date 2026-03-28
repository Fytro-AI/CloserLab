import { useState } from "react";
import { Plus, Building2, Star, Trash2, Edit3, ChevronDown, ChevronUp, Crown, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { useCompanyProfiles, type CompanyProfile, type CompanyProfileDraft } from "@/hooks/useCompanyProfiles";
import { useToast } from "@/hooks/use-toast";

/* ─── Field config ─── */
const FIELDS: { key: keyof CompanyProfileDraft; label: string; placeholder: string; rows: number; required?: boolean }[] = [
  {
    key: "name",
    label: "Company name",
    placeholder: "Acme Corp, My Agency, etc.",
    rows: 1,
    required: true,
  },
  {
    key: "what_you_sell",
    label: "What you sell",
    placeholder: "Briefly describe your product or service in 1-2 lines. What does it actually do?",
    rows: 2,
    required: true,
  },
  {
    key: "who_you_sell_to",
    label: "Your ideal buyer",
    placeholder: "Job titles, company sizes, industries. Who picks up when you call?",
    rows: 2,
    required: true,
  },
  {
    key: "pain_points",
    label: "Problems you solve",
    placeholder: "What's keeping your buyers up at night? List the 2-3 biggest pains you fix.",
    rows: 3,
    required: true,
  },
  {
    key: "objections_and_responses",
    label: "Common objections and how you handle them",
    placeholder: `e.g.\n"Too expensive" → We pay for itself in X weeks, here's how...\n"We already use [competitor]" → The main difference is...\n"Not the right time" → What would need to change for timing to work?`,
    rows: 5,
    required: true,
  },
  {
    key: "past_experience",
    label: "Your sales background",
    placeholder: "Optional. Years in the field, industries you've sold in, deals you're proud of. The AI uses this to tailor advice to your level.",
    rows: 3,
  },
];

/* ─── Profile form ─── */
function ProfileForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<CompanyProfileDraft>;
  onSave: (data: Omit<CompanyProfileDraft, "is_default">) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>({
    name: initial?.name ?? "",
    what_you_sell: initial?.what_you_sell ?? "",
    who_you_sell_to: initial?.who_you_sell_to ?? "",
    pain_points: initial?.pain_points ?? "",
    objections_and_responses: initial?.objections_and_responses ?? "",
    past_experience: initial?.past_experience ?? "",
  });

  const isValid = FIELDS.filter((f) => f.required).every((f) => values[f.key as string]?.trim());

  const handleSubmit = () => {
    if (!isValid) return;
    onSave({
      name: values.name.trim(),
      what_you_sell: values.what_you_sell.trim(),
      who_you_sell_to: values.who_you_sell_to.trim(),
      pain_points: values.pain_points.trim(),
      objections_and_responses: values.objections_and_responses.trim(),
      past_experience: values.past_experience.trim() || null,
    });
  };

  return (
    <div className="space-y-5">
      {FIELDS.map((field) => (
        <div key={field.key as string} className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
            {field.label}
            {field.required && <span className="text-primary">*</span>}
          </label>
          {field.rows === 1 ? (
            <input
              value={values[field.key as string]}
              onChange={(e) => setValues((v) => ({ ...v, [field.key as string]: e.target.value }))}
              placeholder={field.placeholder}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          ) : (
            <textarea
              value={values[field.key as string]}
              onChange={(e) => setValues((v) => ({ ...v, [field.key as string]: e.target.value }))}
              placeholder={field.placeholder}
              rows={field.rows}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          )}
        </div>
      ))}

      <p className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-3">
        This information is fed to your AI sales coach during live calls to give you context-aware, specific tips, not generic advice.
      </p>

      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSubmit}
          disabled={!isValid || saving}
          className="flex-1 rounded-lg gradient-primary py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ─── Profile card ─── */
function ProfileCard({
  profile,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  profile: CompanyProfile;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-xl border bg-card transition-all ${profile.is_default ? "border-primary/40 shadow-[0_0_0_1px_hsl(82_100%_57%/0.1)]" : "border-border"}`}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${profile.is_default ? "gradient-primary" : "bg-secondary"}`}>
            <Building2 className={`h-4 w-4 ${profile.is_default ? "text-primary-foreground" : "text-muted-foreground"}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground text-sm truncate">{profile.name}</span>
              {profile.is_default && (
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/30 rounded-full px-1.5 py-0.5 flex-shrink-0">
                  <Star className="h-2.5 w-2.5" /> Default
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate max-w-[220px]">{profile.what_you_sell}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!profile.is_default && (
            <button
              onClick={onSetDefault}
              className="rounded-md p-1.5 text-muted-foreground hover:text-accent transition-colors"
              title="Set as default"
            >
              <Star className="h-4 w-4" />
            </button>
          )}
          <button onClick={onEdit} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <Edit3 className="h-4 w-4" />
          </button>
          <button onClick={onDelete} className="rounded-md p-1.5 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
          <button onClick={() => setExpanded((e) => !e)} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground transition-colors">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          {[
            { label: "Ideal buyer", value: profile.who_you_sell_to },
            { label: "Problems solved", value: profile.pain_points },
            { label: "Objections & responses", value: profile.objections_and_responses },
            ...(profile.past_experience ? [{ label: "Background", value: profile.past_experience }] : []),
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main page ─── */
export default function CompanySettings() {
  const navigate = useNavigate();
  const { profile: userProfile, loading: profileLoading } = useProfile();
  const { profiles, loading, create, update, remove, setDefault } = useCompanyProfiles();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (profileLoading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <Zap className="h-6 w-6 text-primary animate-pulse" />
      </div>
    );
  }

  if (!userProfile?.is_pro) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-4">
          <Crown className="h-10 w-10 text-accent mx-auto" />
          <h2 className="text-xl font-black text-foreground">Pro Feature</h2>
          <p className="text-sm text-muted-foreground">
            Company profiles are part of CloserLab Pro. Your AI coach uses them to give you specific, contextual tips on real calls.
          </p>
          <button onClick={() => navigate("/pricing")} className="w-full rounded-lg gradient-primary py-3 font-bold text-primary-foreground hover:opacity-90 transition-opacity">
            Upgrade to Pro
          </button>
        </div>
      </div>
    );
  }

  const editingProfile = editingId ? profiles.find((p) => p.id === editingId) : null;

  const handleCreate = async (data: Omit<import("@/hooks/useCompanyProfiles").CompanyProfileDraft, "is_default">) => {
    setSaving(true);
    const result = await create(data);
    setSaving(false);
    if (result) {
      setShowForm(false);
      toast({ title: "Profile created", description: `"${result.name}" is ready to use on live calls.` });
    } else {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  };

  const handleUpdate = async (data: Omit<import("@/hooks/useCompanyProfiles").CompanyProfileDraft, "is_default">) => {
    if (!editingId) return;
    setSaving(true);
    const ok = await update(editingId, data);
    setSaving(false);
    if (ok) {
      setEditingId(null);
      toast({ title: "Profile updated" });
    } else {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
    await remove(id);
    toast({ title: "Profile deleted" });
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-foreground tracking-tight">My Company</h1>
          <p className="text-sm text-muted-foreground">
            Your AI coach reads these profiles during live calls to give you relevant, specific tips - not generic advice.
          </p>
        </div>
      </div>

      {/* New profile form */}
      {showForm && (
        <div className="rounded-xl border border-primary/30 bg-card p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-primary">New company profile</h2>
          <ProfileForm
            onSave={handleCreate}
            onCancel={() => setShowForm(false)}
            saving={saving}
          />
        </div>
      )}

      {/* Existing profiles */}
      {loading ? (
        <div className="text-sm text-muted-foreground animate-pulse">Loading profiles...</div>
      ) : profiles.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center space-y-3">
          <Building2 className="h-8 w-8 text-muted-foreground/40 mx-auto" />
          <p className="font-semibold text-foreground">No company profiles yet</p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Add your first profile and your AI coach will use it to give you context-aware tips during live calls.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Add your first profile
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((p) =>
            editingId === p.id ? (
              <div key={p.id} className="rounded-xl border border-primary/30 bg-card p-6 space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-primary">Edit - {p.name}</h2>
                <ProfileForm
                  initial={p}
                  onSave={handleUpdate}
                  onCancel={() => setEditingId(null)}
                  saving={saving}
                />
              </div>
            ) : (
              <ProfileCard
                key={p.id}
                profile={p}
                onEdit={() => setEditingId(p.id)}
                onDelete={() => handleDelete(p.id, p.name)}
                onSetDefault={() => setDefault(p.id)}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}