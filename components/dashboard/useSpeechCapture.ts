"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { INITIAL_SPEECH_STATE, speechReducer, type SpeechState } from "@/lib/speech-state";

const SILENCE_TIMEOUT_MS = 10_000;
const PRIMARY_LANGUAGE = "en-ZA";
const FALLBACK_LANGUAGE = "en-GB";

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
  const language = useRef(PRIMARY_LANGUAGE);
  const onFinalRef = useRef(onFinal);
  const userStopped = useRef(false);
  const suppressNext = useRef(false);

  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  useEffect(() => {
    if (!recognitionConstructor()) {
      dispatch({ type: "support", supported: false });
    }
    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
      userStopped.current = true;
      recognition.current?.abort();
    };
  }, []);

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const armTimer = useCallback(() => {
    clearTimer();
    timer.current = window.setTimeout(() => {
      recognition.current?.abort();
      dispatch({ type: "fail", reason: "timeout", message: "We did not hear anything. Try again, or type the job instead." });
    }, SILENCE_TIMEOUT_MS);
  }, [clearTimer]);

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
    suppressNext.current = false;

    const instance = new Constructor();
    instance.lang = language.current;
    instance.interimResults = true;
    instance.continuous = true;
    instance.maxAlternatives = 1;

    instance.onresult = (event) => {
      armTimer();

      if (suppressNext.current) {
        suppressNext.current = false;
        return;
      }

      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result?.[0]?.transcript ?? "";
        if (result?.isFinal) {
          onFinalRef.current(text.trim());
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
      clearTimer();
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
          if (language.current === PRIMARY_LANGUAGE) {
            language.current = FALLBACK_LANGUAGE;
            void begin();
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
      clearTimer();
      if (userStopped.current) {
        dispatch({ type: "end" });
        dispatch({ type: "end" });
        return;
      }
      suppressNext.current = true;
      try {
        instance.start();
        armTimer();
      } catch {
        dispatch({ type: "end" });
        dispatch({ type: "end" });
      }
    };

    recognition.current = instance;
    dispatch({ type: "start" });
    buzz();
    armTimer();
    try {
      instance.start();
    } catch {
      clearTimer();
      dispatch({ type: "fail", reason: "error", message: "Voice capture could not start. Type the job instead." });
    }
  }, [armTimer, clearTimer]);

  const stop = useCallback(() => {
    clearTimer();
    buzz();
    userStopped.current = true;
    recognition.current?.stop();
  }, [clearTimer]);

  const toggleManual = useCallback(() => dispatch({ type: "toggle-manual" }), []);

  return { state, start: begin, stop, toggleManual };
}
