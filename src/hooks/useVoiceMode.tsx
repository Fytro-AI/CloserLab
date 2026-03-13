import { useState, useRef, useCallback, useEffect } from "react";

interface UseVoiceModeOptions {
  enabled: boolean;
  onTranscript: (text: string) => void;
}

const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;
const SILENT_AUDIO_DATA_URI =
  "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAACAAACcQCA";
const AUDIO_FETCH_TIMEOUT_MS = 12000;
const AUDIO_PLAY_MIN_TIMEOUT_MS = 5000;
const AUDIO_PLAY_MAX_TIMEOUT_MS = 12000;
const AUDIO_MS_PER_WORD_ESTIMATE = 420;

export function useVoiceMode({ enabled, onTranscript }: UseVoiceModeOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interimText, setInterimText] = useState("");

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);
  const shouldKeepListeningRef = useRef(false);
  const persistentStreamRef = useRef<MediaStream | null>(null);
  const latestInterimRef = useRef("");
  const lastCommittedTranscriptRef = useRef("");
  const interimCommitTimerRef = useRef<number | null>(null);

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const isIOS =
    typeof navigator !== "undefined" &&
    (/iP(hone|ad|od)/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

  // --- Helpers ---

  const clearInterimCommitTimer = useCallback(() => {
    if (interimCommitTimerRef.current) {
      window.clearTimeout(interimCommitTimerRef.current);
      interimCommitTimerRef.current = null;
    }
  }, []);

  const ensureAudioElement = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "auto";
      audioRef.current.setAttribute("playsinline", "true");
    }
    return audioRef.current;
  }, []);

  const ensureAudioUnlocked = useCallback(() => {
    if (!enabled) return;
    const audio = ensureAudioElement();
    if (audioUnlockedRef.current) return;
    audio.muted = true;
    audio.src = SILENT_AUDIO_DATA_URI;
    audio.play().then(() => {
      audio.pause();
      audio.currentTime = 0;
      audioUnlockedRef.current = true;
    }).catch(() => {}).finally(() => {
      audio.muted = false;
      audio.removeAttribute("src");
      audio.load();
    });
  }, [enabled, ensureAudioElement]);

  const acquirePersistentStream = useCallback(async () => {
    if (persistentStreamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      persistentStreamRef.current = stream;
    } catch {
      // Permission denied
    }
  }, []);

  const releasePersistentStream = useCallback(() => {
    persistentStreamRef.current?.getTracks().forEach((t) => t.stop());
    persistentStreamRef.current = null;
  }, []);

  // --- Interim commit (iOS never fires isFinal sometimes) ---

  const scheduleInterimCommit = useCallback(() => {
    clearInterimCommitTimer();
    interimCommitTimerRef.current = window.setTimeout(() => {
      if (!shouldKeepListeningRef.current || isSpeaking) return;
      const text = latestInterimRef.current.trim();
      if (text.length < 2) return;
      const normalized = text.toLowerCase();
      if (normalized === lastCommittedTranscriptRef.current) return;
      lastCommittedTranscriptRef.current = normalized;
      latestInterimRef.current = "";
      setInterimText("");
      onTranscript(text);
    }, 1400);
  }, [clearInterimCommitTimer, isSpeaking, onTranscript]);

  // --- Core recognition session (desktop: continuous; iOS: one-shot via hold) ---

  const startRecognitionSession = useCallback(() => {
    if (!enabled || !isSupported || isSpeaking) return;
    if (recognitionRef.current) return;

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();

    // iOS hold-to-talk: non-continuous. Desktop: continuous.
    recognition.continuous = !isIOS;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = String(event.results[i][0]?.transcript || "").trim();
        if (!transcript) continue;

        if (event.results[i].isFinal) {
          const normalized = transcript.toLowerCase();
          if (normalized !== lastCommittedTranscriptRef.current) {
            lastCommittedTranscriptRef.current = normalized;
            onTranscript(transcript);
          }
          latestInterimRef.current = "";
          setInterimText("");
          clearInterimCommitTimer();
        } else {
          interim += `${transcript} `;
        }
      }

      const nextInterim = interim.trim();
      latestInterimRef.current = nextInterim;
      setInterimText(nextInterim);
      if (nextInterim) scheduleInterimCommit();
    };

    recognition.onerror = (event: any) => {
      const error = event?.error;
      if (error === "not-allowed" || error === "service-not-allowed") {
        shouldKeepListeningRef.current = false;
      }
      recognitionRef.current = null;
      setIsListening(false);
      setInterimText("");
      latestInterimRef.current = "";
      clearInterimCommitTimer();

      // // Desktop only: try one automatic restart for transient errors
      // if (!isIOS && shouldKeepListeningRef.current && error !== "not-allowed" && error !== "service-not-allowed") {
      //   window.setTimeout(() => startRecognitionSession(), 300);
      // }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
      clearInterimCommitTimer();

      // On hold-to-talk end (iOS), commit any pending interim
      if (isIOS) {
        const pending = latestInterimRef.current.trim();
        if (pending.length >= 2) {
          const normalized = pending.toLowerCase();
          if (normalized !== lastCommittedTranscriptRef.current) {
            lastCommittedTranscriptRef.current = normalized;
            onTranscript(pending);
          }
        }
        latestInterimRef.current = "";
        setInterimText("");
        return; // iOS: never auto-restart
      }

      // Desktop: auto-restart
      if (!shouldKeepListeningRef.current || isSpeaking) return;
      window.setTimeout(() => {
        if (shouldKeepListeningRef.current && !isSpeaking) {
          startRecognitionSession();
        }
      }, 250);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
    }
  }, [clearInterimCommitTimer, enabled, isIOS, isSpeaking, isSupported, onTranscript, scheduleInterimCommit]);

  // --- Hold-to-talk API (iOS) ---
  // CRITICAL: must be called synchronously from a touch/click event handler

  const startHoldToTalk = useCallback(() => {
    if (!enabled || !isSupported || isSpeaking) return;

    // Kill any existing session
    try { recognitionRef.current?.abort(); } catch {}
    recognitionRef.current = null;

    // Unlock audio on first gesture
    ensureAudioUnlocked();

    // Acquire persistent stream if not yet done
    if (!persistentStreamRef.current) {
      navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      }).then((stream) => {
        persistentStreamRef.current = stream;
      }).catch(() => {});
    }

    lastCommittedTranscriptRef.current = "";
    latestInterimRef.current = "";
    setInterimText("");

    // Start recognition synchronously within gesture
    startRecognitionSession();
  }, [enabled, ensureAudioUnlocked, isSpeaking, isSupported, startRecognitionSession]);

  const stopHoldToTalk = useCallback(() => {
    clearInterimCommitTimer();

    // Commit any pending interim immediately
    const pending = latestInterimRef.current.trim();
    if (pending.length >= 2) {
      const normalized = pending.toLowerCase();
      if (normalized !== lastCommittedTranscriptRef.current) {
        lastCommittedTranscriptRef.current = normalized;
        onTranscript(pending);
      }
    }
    latestInterimRef.current = "";
    setInterimText("");

    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
    setIsListening(false);
  }, [clearInterimCommitTimer, onTranscript]);

  // --- Desktop public API (unchanged) ---

  const stopListening = useCallback(() => {
    shouldKeepListeningRef.current = false;
    clearInterimCommitTimer();
    latestInterimRef.current = "";
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
    setIsListening(false);
    setInterimText("");
  }, [clearInterimCommitTimer]);

  const startListening = useCallback(async (fromUserGesture = false) => {
    if (!enabled || !isSupported || isSpeaking) return;

    shouldKeepListeningRef.current = true;
    lastCommittedTranscriptRef.current = "";

    ensureAudioUnlocked();

    if (fromUserGesture) {
      await acquirePersistentStream();
    }

    if (isIOS && !persistentStreamRef.current) {
      return;
    }

    const audio = ensureAudioElement();
    audio.pause();
    audio.currentTime = 0;

    if (recognitionRef.current) return;
    startRecognitionSession();
  }, [acquirePersistentStream, enabled, ensureAudioElement, ensureAudioUnlocked, isIOS, isSpeaking, isSupported, startRecognitionSession]);

  // --- TTS ---

  const speakWithBrowserFallback = useCallback((text: string) => {
    return new Promise<void>((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis) { resolve(); return; }
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      } catch { resolve(); }
    });
  }, []);

  const speak = useCallback(async (text: string): Promise<void> => {
    if (!enabled) return;
    const clean = text.replace(/\[CALL_ENDED\]/g, "").trim();
    if (!clean) return;

    stopListening();
    setIsSpeaking(true);

    const audio = ensureAudioElement();
    ensureAudioUnlocked();

    let audioUrl: string | null = null;
    const cleanup = () => {
      if (audioUrl) { URL.revokeObjectURL(audioUrl); audioUrl = null; }
      audio.onended = null;
      audio.onerror = null;
    };

    try {
      const estimatedPlaybackTimeoutMs = Math.min(
        AUDIO_PLAY_MAX_TIMEOUT_MS,
        Math.max(AUDIO_PLAY_MIN_TIMEOUT_MS, clean.split(/\s+/).filter(Boolean).length * AUDIO_MS_PER_WORD_ESTIMATE)
      );

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), AUDIO_FETCH_TIMEOUT_MS);

      const response = await fetch(TTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text: clean }),
        signal: controller.signal,
      }).finally(() => { window.clearTimeout(timeout); });

      if (!response.ok) throw new Error(`TTS failed (${response.status})`);

      const audioBlob = await response.blob();
      audioUrl = URL.createObjectURL(audioBlob);

      audio.pause();
      audio.currentTime = 0;
      audio.src = audioUrl;

      await new Promise<void>((resolve) => {
        const playTimeout = window.setTimeout(() => { audio.pause(); resolve(); }, estimatedPlaybackTimeoutMs);
        const settle = () => { window.clearTimeout(playTimeout); resolve(); };
        audio.onended = settle;
        audio.onerror = settle;
        audio.onstalled = settle;
        audio.onabort = settle;
        audio.play().catch(settle);
      });
    } catch (err) {
      console.error("TTS error, using fallback:", err);
      await speakWithBrowserFallback(clean);
    } finally {
      cleanup();
      setIsSpeaking(false);
    }
  }, [enabled, ensureAudioElement, ensureAudioUnlocked, speakWithBrowserFallback, stopListening]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.currentTime = 0; }
    setIsSpeaking(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterimCommitTimer();
      try { recognitionRef.current?.stop(); } catch {}
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      const audio = audioRef.current;
      if (audio) { audio.pause(); audio.removeAttribute("src"); audio.load(); }
      releasePersistentStream();
    };
  }, [clearInterimCommitTimer, releasePersistentStream]);

  return {
    isListening,
    isSpeaking,
    interimText,
    isSupported,
    isIOS,
    startListening,
    stopListening,
    startHoldToTalk,
    stopHoldToTalk,
    speak,
    stopSpeaking,
  };
}
