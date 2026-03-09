import { PhoneOff, Mic, MicOff } from "lucide-react";

interface CallScreenProps {
  prospectName: string;
  prospectCompany: string;
  personaIcon: string;
  elapsed: number;
  isListening: boolean;
  isSpeaking: boolean;
  isTyping: boolean;
  interimText: string;
  lastAIMessage: string;
  isIOS: boolean;
  onMicDown: () => void;
  onMicUp: () => void;
  onToggleMic: () => void;
  onEndCall: () => void;
}

function formatTime(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

function AudioWave({ active, color = "bg-primary" }: { active: boolean; color?: string }) {
  return (
    <div className="flex items-center justify-center gap-[3px] h-8">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full transition-all duration-150 ${color} ${
            active ? "animate-audio-wave" : "h-1 opacity-30"
          }`}
          style={{
            animationDelay: active ? `${i * 0.12}s` : undefined,
          }}
        />
      ))}
    </div>
  );
}

export default function CallScreen({
  prospectName,
  prospectCompany,
  personaIcon,
  elapsed,
  isListening,
  isSpeaking,
  isTyping,
  interimText,
  lastAIMessage,
  isIOS,
  onMicDown,
  onMicUp,
  onToggleMic,
  onEndCall,
}: CallScreenProps) {
  const prospectActive = isSpeaking || isTyping;

  const statusLabel = isSpeaking
    ? "Speaking…"
    : isTyping
    ? "Speaking…"
    : isListening
    ? "Listening…"
    : isIOS
    ? "Hold mic to speak"
    : "On Call";

  // iOS: hold-to-talk handlers. Desktop: toggle.
  const micButtonProps = isIOS
    ? {
        onTouchStart: (e: React.TouchEvent) => {
          e.preventDefault();
          onMicDown();
        },
        onTouchEnd: (e: React.TouchEvent) => {
          e.preventDefault();
          onMicUp();
        },
        onTouchCancel: (e: React.TouchEvent) => {
          e.preventDefault();
          onMicUp();
        },
      }
    : {
        onClick: onToggleMic,
      };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background select-none">
      {/* Top status bar */}
      <div className="flex items-center justify-center pt-12 pb-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Main content — centered */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
        {/* Avatar with animated ring */}
        <div className="relative">
          <div
            className={`absolute -inset-3 rounded-full transition-all duration-500 ${
              prospectActive
                ? "bg-primary/20 animate-pulse scale-110"
                : "bg-transparent scale-100"
            }`}
          />
          <div
            className={`relative flex h-28 w-28 items-center justify-center rounded-full border-2 transition-all duration-300 ${
              prospectActive
                ? "border-primary shadow-[0_0_30px_hsl(82_100%_57%/0.3)]"
                : "border-border"
            } bg-card`}
          >
            <span className="text-5xl">{personaIcon}</span>
          </div>
        </div>

        {/* Name + Company */}
        <div className="text-center">
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            {prospectName}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{prospectCompany}</p>
        </div>

        {/* Timer */}
        <div className="font-mono text-3xl font-light text-muted-foreground tracking-widest">
          {formatTime(elapsed)}
        </div>

        {/* Audio visualization */}
        <div className="h-12 flex flex-col items-center justify-center gap-1">
          {prospectActive && (
            <>
              <AudioWave active={true} color="bg-primary" />
              <span className="text-[10px] text-muted-foreground mt-1">
                {lastAIMessage.slice(0, 60)}{lastAIMessage.length > 60 ? "…" : ""}
              </span>
            </>
          )}
          {isListening && !prospectActive && (
            <>
              <AudioWave active={true} color="bg-accent" />
              {interimText && (
                <span className="text-[10px] text-accent mt-1 max-w-[250px] truncate">
                  {interimText}
                </span>
              )}
            </>
          )}
          {!isListening && !prospectActive && isIOS && (
            <span className="text-sm font-medium text-accent">👆 Hold mic to speak</span>
          )}
          {!isListening && !prospectActive && !isIOS && (
            <AudioWave active={false} />
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="pb-12 pt-6 flex items-center justify-center gap-8">
        {/* Mic button */}
        <button
          {...micButtonProps}
          disabled={isSpeaking || isTyping}
          className={`flex h-16 w-16 items-center justify-center rounded-full transition-all touch-none ${
            isListening
              ? "bg-accent text-accent-foreground shadow-[0_0_20px_hsl(45_100%_55%/0.3)] scale-110"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          } disabled:opacity-40`}
        >
          {isListening ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
        </button>

        {/* End Call */}
        <button
          onClick={onEndCall}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg hover:opacity-90 transition-opacity"
        >
          <PhoneOff className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
