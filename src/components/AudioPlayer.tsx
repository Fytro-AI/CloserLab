import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, Loader2, Download, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AudioPlayerProps {
  callId: string;
  storagePath: string;
  duration?: number; // seconds, from call_history
}

function formatTime(s: number): string {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/**
 * Draws a static waveform visualization using random-seeded bars.
 * When we have a real AudioBuffer we can render actual waveform data.
 */
function WaveformBars({
  progress,
  bars = 60,
  seed,
}: {
  progress: number;
  bars?: number;
  seed?: string;
}) {
  // Deterministic pseudo-random heights based on seed (call ID)
  const heights = Array.from({ length: bars }, (_, i) => {
    const hash = (seed?.charCodeAt(i % (seed?.length || 1)) ?? i) * (i + 1) * 7919;
    return 20 + (hash % 60); // 20–80% height
  });

  return (
    <div className="flex items-center gap-[2px] h-10 w-full">
      {heights.map((h, i) => {
        const pct = i / bars;
        const isPast = pct <= progress;
        return (
          <div
            key={i}
            className="flex-1 rounded-full transition-colors duration-75"
            style={{
              height: `${h}%`,
              background: isPast
                ? "hsl(var(--primary))"
                : "hsl(var(--muted-foreground) / 0.2)",
            }}
          />
        );
      })}
    </div>
  );
}

export default function AudioPlayer({ callId, storagePath, duration }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration ?? 0);
  const [volume, setVolume] = useState(1);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const fetchUrl = useCallback(async () => {
    if (url) return; // already loaded
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/get-recording-url`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ call_id: callId, storage_path: storagePath }),
      });
      if (!res.ok) throw new Error("Failed to load recording");
      const data = await res.json();
      setUrl(data.url);
    } catch (e) {
      setError("Could not load recording");
    } finally {
      setLoading(false);
    }
  }, [callId, storagePath, url]);

  useEffect(() => {
    if (!url || !audioRef.current) return;
    const audio = audioRef.current;
    audio.src = url;
    audio.volume = volume;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => {
      if (isFinite(audio.duration)) setAudioDuration(audio.duration);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
    };
  }, [url]);

  const togglePlay = async () => {
    if (!url) {
      await fetchUrl();
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      await audio.play();
      setIsPlaying(true);
    }
  };

  // Auto-play when URL loads for the first time (user clicked play to trigger)
  useEffect(() => {
    if (url && audioRef.current && !isPlaying) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [url]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressBarRef.current;
    const audio = audioRef.current;
    if (!bar || !audio || !audioDuration) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * audioDuration;
    setCurrentTime(pct * audioDuration);
  };

  const progress = audioDuration > 0 ? currentTime / audioDuration : 0;

  const handleDownload = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `call-${callId}.webm`;
    a.click();
  };

  return (
    <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-3">
      <audio ref={audioRef} preload="none" />

      {/* Top row: play + waveform + time */}
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          disabled={loading}
          className="flex-shrink-0 w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 ml-0.5" />
          )}
        </button>

        {/* Waveform / progress */}
        <div
          ref={progressBarRef}
          className="flex-1 cursor-pointer"
          onClick={handleSeek}
        >
          <WaveformBars progress={progress} seed={callId} />
        </div>

        {/* Time */}
        <div className="flex-shrink-0 text-xs text-muted-foreground tabular-nums min-w-[72px] text-right">
          {formatTime(currentTime)} / {formatTime(audioDuration)}
        </div>
      </div>

      {/* Bottom row: volume + download */}
      <div className="flex items-center gap-3">
        <Volume2 className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setVolume(v);
            if (audioRef.current) audioRef.current.volume = v;
          }}
          className="w-20 accent-primary"
        />
        <div className="flex-1" />
        {url && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </div>
      )}
    </div>
  );
}