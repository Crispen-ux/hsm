"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { INITIAL_SPEECH_STATE, speechReducer, type SpeechState } from "@/lib/speech-state";

const SILENCE_TIMEOUT_MS = 30_000;
const SILENCE_WARNING_MS = 20_000;
const LANGUAGE_CHAIN = ["en-ZA", "en-GB", "en-US", "en-AU", "en-IN"] as const;
const RESTART_BACKOFF_MS = [0, 200, 500, 1000, 2000];
const MAX_RESTARTS = 5;
const NOISE_MIN_LENGTH = 2;
const FILLER_SOUNDS = new Set([
  "uh", "um", "er", "ah", "hmm", "mhm", "hm", "oh", "uhh", "umm", "err",
]);
const FILLER_PATTERN = /\b(?:um|uh|er|ah|hmm|mhm|hm|oh)\b/gi;

function recognitionConstructor(): SpeechRecognitionConstructorLike | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

async function microphoneDenied(): Promise<boolean> {
  try {
    const status = await navigator.permissions?.query({ name: "microphone" as PermissionName });
    return status?.state === "denied";
  } catch {
    return false;
  }
}

function buzz(): void {
  try {
    navigator.vibrate?.(15);
  } catch {
    return;
  }
}

function cleanTranscript(raw: string): string {
  return raw
    .replace(FILLER_PATTERN, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isNoise(text: string): boolean {
  const cleaned = text.trim().toLowerCase();
  if (cleaned.length < NOISE_MIN_LENGTH) return true;
  if (FILLER_SOUNDS.has(cleaned)) return true;
  return false;
}

export interface SpeechCaptureApi {
  state: SpeechState;
  start: () => Promise<void>;
  stop: () => void;
  toggleManual: () => void;
}

export function useSpeechCapture(onFinal: (text: string) => void): SpeechCaptureApi {
  const [state, dispatch] = useReducer(speechReducer, INITIAL_SPEECH_STATE);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const timer = useRef<number | null>(null);
  const warningTimer = useRef<number | null>(null);
  const languageIndex = useRef(0);
  const onFinalRef = useRef(onFinal);
  const userStopped = useRef(false);
  const restartCount = useRef(0);
  const lastFinalText = useRef("");
  const lastFinalTime = useRef(0);

  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  useEffect(() => {
    if (!recognitionConstructor()) {
      dispatch({ type: "support", supported: false });
    }
    return () => {
      clearAllTimers();
      userStopped.current = true;
      recognition.current?.abort();
    };
  }, []);

  const clearAllTimers = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    if (warningTimer.current !== null) {
      window.clearTimeout(warningTimer.current);
      warningTimer.current = null;
    }
  }, []);

  const armTimer = useCallback(() => {
    clearAllTimers();
    warningTimer.current = window.setTimeout(() => {
      dispatch({ type: "interim", text: "Still listening... speak up or tap to stop." });
    }, SILENCE_WARNING_MS);
    timer.current = window.setTimeout(() => {
      recognition.current?.abort();
      dispatch({ type: "fail", reason: "timeout", message: "We did not hear anything. Try again, or type the job instead." });
    }, SILENCE_TIMEOUT_MS);
  }, [clearAllTimers]);

  const begin = useCallback(async () => {
    const Constructor = recognitionConstructor();
    if (!Constructor) {
      dispatch({ type: "support", supported: false });
      return;
    }
    if (await microphoneDenied()) {
      dispatch({ type: "fail", reason: "denied", message: "Microphone access is blocked. Allow it in your browser settings, or type the job instead." });
      return;
    }

    userStopped.current = false;
    restartCount.current = 0;
    lastFinalText.current = "";
    lastFinalTime.current = 0;
    languageIndex.current = 0;

    const startRecognition = () => {
      const lang = LANGUAGE_CHAIN[languageIndex.current] ?? "en-GB";

      const instance = new Constructor();
      instance.lang = lang;
      instance.interimResults = true;
      instance.continuous = true;
      instance.maxAlternatives = 1;

      instance.onresult = (event) => {
        armTimer();

        let interim = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const text = result?.[0]?.transcript ?? "";
          if (result?.isFinal) {
            const cleaned = cleanTranscript(text);
            if (!cleaned) continue;
            if (isNoise(cleaned)) continue;

            const dedupeKey = cleaned.toLowerCase();
            const now = Date.now();
            if (
              dedupeKey === lastFinalText.current &&
              now - lastFinalTime.current < 2000
            ) {
              continue;
            }

            lastFinalText.current = dedupeKey;
            lastFinalTime.current = now;

            onFinalRef.current(cleaned);
            dispatch({ type: "final" });
          } else {
            interim += text;
          }
        }
        if (interim) {
          dispatch({ type: "interim", text: interim });
        }
      };

      instance.onerror = (event) => {
        clearAllTimers();
        switch (event.error) {
          case "not-allowed":
          case "service-not-allowed":
            dispatch({ type: "fail", reason: "denied", message: "Microphone access was refused. Allow it in your browser settings, or type the job instead." });
            break;
          case "no-speech":
            break;
          case "audio-capture":
            dispatch({ type: "fail", reason: "error", message: "No microphone was found. Type the job instead." });
            break;
          case "network":
            dispatch({ type: "fail", reason: "error", message: "Voice capture needs a connection. Type the job instead." });
            break;
          case "language-not-supported":
            if (languageIndex.current < LANGUAGE_CHAIN.length - 1) {
              languageIndex.current += 1;
              restartRecognition();
            } else {
              dispatch({ type: "fail", reason: "error", message: "Voice capture does not support this language here. Type the job instead." });
            }
            break;
          case "aborted":
            break;
          default:
            break;
        }
      };

      instance.onend = () => {
        clearAllTimers();
        if (userStopped.current) {
          dispatch({ type: "end" });
          return;
        }

        restartCount.current += 1;
        if (restartCount.current > MAX_RESTARTS) {
          dispatch({ type: "fail", reason: "error", message: "Voice capture stopped unexpectedly. Try again, or type the job instead." });
          return;
        }

        const backoff = RESTART_BACKOFF_MS[Math.min(restartCount.current, RESTART_BACKOFF_MS.length - 1)];
        setTimeout(() => {
          if (userStopped.current) return;
          restartRecognition();
        }, backoff);
      };

      recognition.current = instance;
      dispatch({ type: "start" });
      buzz();
      armTimer();
      try {
        instance.start();
      } catch {
        clearAllTimers();
        dispatch({ type: "fail", reason: "error", message: "Voice capture could not start. Type the job instead." });
      }
    };

    const restartRecognition = () => {
      try {
        recognition.current?.abort();
      } catch {
        // ignore
      }
      startRecognition();
    };

    startRecognition();
  }, [armTimer, clearAllTimers]);

  const stop = useCallback(() => {
    clearAllTimers();
    buzz();
    userStopped.current = true;
    recognition.current?.stop();
  }, [clearAllTimers]);

  const toggleManual = useCallback(() => dispatch({ type: "toggle-manual" }), []);

  return { state, start: begin, stop, toggleManual };
}
