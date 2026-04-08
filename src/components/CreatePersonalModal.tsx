import { useState } from "react";
import { Loader2, UserPlus, Briefcase, Building, Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreatePersonaForm } from "@/hooks/useCustomPersonas";

/* ── Option sets ── */
const INDUSTRIES = [
  "SaaS", "FinTech", "Healthcare", "Real Estate", "Recruiting",
  "E-commerce", "Agency / Marketing", "Consulting", "Manufacturing",
  "Logistics", "Legal", "Insurance", "Education", "Other",
];

const JOB_TITLES = [
  "CEO / Founder",
  "VP of Sales",
  "Sales Manager",
  "Account Executive",
  "Procurement Specialist",
  "Head of Operations",
  "Marketing Director",
  "CTO / Technical Lead",
  "CFO / Finance Director",
  "HR Director",
];

const COMPANY_SIZES = [
  "1–10 (Startup)", "11–50 (SMB)", "51–200 (Mid-market)",
  "201–1000 (Growth)", "1000+ (Enterprise)",
];

const AGE_RANGES = [
  "18-22",
  "22-26",
  "26-30",
  "30-34",
  "34-38",
  "38-42",
  "42-46",
  "46-50",
  "50-54",
  "54-58",
  "58-62",
  "62-66",
  "66-70",
];

const CALL_GOALS = [
  "Book a meeting",
  "Demo the product",
  "Close the deal",
  "Qualify the lead",
  "Handle objections only",
];

const EMPTY: CreatePersonaForm = {
  name: "",
  job_title: "",
  industry: "",
  company_size: "",
  age_range: "",
  conversation_type: "B2B",
  description: "",
  product_details: "",
  call_goal: "",
};

export default function CreatePersonaModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: CreatePersonaForm) => Promise<void>;
}) {
  const [form, setForm] = useState<CreatePersonaForm>(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const set = (field: keyof CreatePersonaForm) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const isValid =
    form.name.trim() &&
    form.job_title.trim() &&
    form.industry &&
    form.company_size &&
    form.age_range &&
    form.description.trim() &&
    form.product_details.trim();

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(form);
      setForm(EMPTY);
      onClose();
    } catch {
      // parent shows toast
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            New AI Prospect
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Conversation Type — B2B / B2C cards */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Conversation Type</label>
            <div className="grid grid-cols-2 gap-3">
              {(["B2B", "B2C"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => set("conversation_type")(type)}
                  className={`rounded-lg border p-4 text-center transition-all ${
                    form.conversation_type === type
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <div className="text-lg font-bold text-foreground">{type}</div>
                  <div className="text-xs text-muted-foreground">
                    {type === "B2B" ? "Business to Business" : "Business to Consumer"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Row: Name + Age */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Prospect Name</label>
              <Input
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
                placeholder="e.g. Sarah Chen"
                maxLength={60}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Age Range</label>
              <Select value={form.age_range} onValueChange={set("age_range")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select age" />
                </SelectTrigger>
                <SelectContent>
                  {AGE_RANGES.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row: Job Title + Industry */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-muted-foreground" />
                Job Title
              </label>
              <Select value={form.job_title} onValueChange={set("job_title")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Job Title" />
                </SelectTrigger>
                <SelectContent>
                  {JOB_TITLES.map((i) => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-muted-foreground" />
                Industry
              </label>
              <Select value={form.industry} onValueChange={set("industry")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((i) => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row: Company Size + Call Goal */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Company Size</label>
              <Select value={form.company_size} onValueChange={set("company_size")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_SIZES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-muted-foreground" />
                Call Goal
                <span className="text-xs font-normal text-muted-foreground">(optional)</span>
              </label>
              <Select value={form.call_goal || ""} onValueChange={(v) => set("call_goal")(v || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select goal" />
                </SelectTrigger>
                <SelectContent>
                  {CALL_GOALS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Prospect Description */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">
              Prospect Description
              <span className="ml-2 text-xs font-normal text-muted-foreground">{form.description.length}/400</span>
            </label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description")(e.target.value)}
              placeholder="Describe their personality, pain points, buying style, typical objections… The more detail, the more realistic the AI."
              rows={3}
              maxLength={400}
            />
          </div>

          {/* Product Details */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">
              Your Product / Service
              <span className="ml-2 text-xs font-normal text-muted-foreground">{form.product_details.length}/300</span>
            </label>
            <Textarea
              value={form.product_details}
              onChange={(e) => set("product_details")(e.target.value)}
              placeholder="What are you selling? What's the value prop? What problems does it solve?"
              rows={2}
              maxLength={300}
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="w-full flex items-center justify-center gap-2 rounded-lg gradient-primary py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Create Prospect"
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}