import { useState, useRef, useCallback } from "react";

interface UseVoiceModeOptions {
  enabled: boolean;
  onTranscript: (text: string) => void;
}

export function useVoiceMode({ enabled, onTranscript }: UseVoiceModeOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<any>(null);

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const startListening = useCallback(() => {
    if (!enabled || !isSupported) return;

    // Cancel any ongoing speech first
    speechSynthesis.cancel();

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setInterimText("");
          onTranscript(transcript);
        } else {
          interim += transcript;
        }
      }
      if (interim) setInterimText(interim);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText("");
    };

    recognition.onerror = () => {
      setIsListening(false);
      setInterimText("");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [enabled, isSupported, onTranscript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimText("");
  }, []);

  const speak = useCallback(
    (text: string): Promise<void> => {
      if (!enabled) return Promise.resolve();
      return new Promise<void>((resolve) => {
        // Clean up any tags
        const clean = text.replace(/\[CALL_ENDED\]/g, "").trim();
        if (!clean) { resolve(); return; }

        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;

        // Try to pick a natural-sounding voice
        const voices = speechSynthesis.getVoices();
        const preferred = voices.find(
          (v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("natural")
        ) || voices.find((v) => v.lang.startsWith("en-US"));
        if (preferred) utterance.voice = preferred;

        setIsSpeaking(true);
        utterance.onend = () => { setIsSpeaking(false); resolve(); };
        utterance.onerror = () => { setIsSpeaking(false); resolve(); };
        speechSynthesis.speak(utterance);
      });
    },
    [enabled]
  );

  const stopSpeaking = useCallback(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return {
    isListening,
    isSpeaking,
    interimText,
    isSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
