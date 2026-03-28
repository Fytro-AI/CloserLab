import { Link } from "react-router-dom";
import { Phone, ArrowLeft } from "lucide-react";

export default function ComingSoon() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8 animate-slide-up">

        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card mx-auto">
          <Phone className="h-7 w-7 text-muted-foreground/30" />
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-black text-foreground tracking-tight">
            Coming soon
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Live Call Assistant</strong> is currently being polished
            and will be available to Pro users very soon.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 text-left space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">What's coming</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Share your call tab - Teams, Zoom, Meet - and take a live AI assistant with you
            on real calls to give you the exact replies to every objection.
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

      </div>
    </div>
  );
}