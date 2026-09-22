"use client";

import { cn } from "@/lib/cn";
import { highlightTranscript } from "@/lib/highlight";
import { manualPanelVisible } from "@/lib/speech-state";
import type { ParsedSpeech } from "@/lib/validations";
import type { SpeechCaptureApi } from "@/components/dashboard/useSpeechCapture";

interface VoicePanelProps {
  speech: SpeechCaptureApi;
  transcript: string;
  parsed: ParsedSpeech;
  onTranscriptChange: (value: string) => void;
  onClear: () => void;
}

const STATUS_TEXT: Readonly<Record<string, string>> = {
  idle: "Tap and say the job",
  listening: "Listening... tap to stop",
  processing: "Working it out",
};

export function VoicePanel({ speech, transcript, parsed, onTranscriptChange, onClear }: VoicePanelProps) {
  const { state } = speech;
  const listening = state.status === "listening";
  const unavailable = state.status === "unsupported";
  const showManual = manualPanelVisible(state);
  const failure = state.message !== null && state.status !== "listening";
  const segments = highlightTranscript(transcript, parsed.spans);

  return (
    <section aria-labelledby="voice-title" className="chamfer-2 plate mt-6">
      <div className="chamfer-2 plate-inner p-5">
        <h2 id="voice-title" className="sr-only">
          Describe the job
        </h2>

        <div className="flex flex-col items-center">
          <div className="relative">
            {listening ? (
              <>
                <span className="mic-ring absolute inset-0 rounded-full border-2 border-hawk-crimson" aria-hidden />
                <span className="mic-ring absolute inset-0 rounded-full border-2 border-hawk-crimson" style={{ animationDelay: "0.7s" }} aria-hidden />
              </>
            ) : null}
            <button
              type="button"
              data-testid="mic-button"
              onClick={() => (listening ? speech.stop() : void speech.start())}
              disabled={unavailable || state.status === "processing"}
              aria-pressed={listening}
              aria-label={listening ? "Stop listening" : "Start listening"}
              className={cn(
                "relative flex h-32 w-32 items-center justify-center rounded-full border-2 transition-transform active:scale-95 disabled:opacity-40",
                listening ? "border-hawk-crimson bg-hawk-crimson/20 text-white" : "border-zinc-500 bg-hawk-obsidian-card text-zinc-100",
              )}
            >
              <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
            </button>
          </div>

          <p aria-live="polite" data-testid="voice-status" className="mt-4 text-center text-sm text-zinc-200">
            {failure ? (
              <span className="text-hawk-gold">{state.message}</span>
            ) : listening ? (
              <span className="text-emerald-400">{STATUS_TEXT[state.status]}</span>
            ) : (
              STATUS_TEXT[state.status] ?? STATUS_TEXT.idle
            )}
          </p>
        </div>

        <div className="mt-5 min-h-[3.5rem] border-t border-hawk-obsidian-border pt-4" data-testid="transcript">
          {transcript || state.interim ? (
            <p className="text-lg leading-snug text-zinc-100">
              {segments.map((segment, index) =>
                segment.kind ? (
                  <mark key={`${index}-${segment.text}`} title={segment.kind} className="bg-hawk-crimson/30 px-0.5 text-white">
                    {segment.text}
                  </mark>
                ) : (
                  <span key={`${index}-${segment.text}`}>{segment.text}</span>
                ),
              )}
              {state.interim ? <span className="italic text-zinc-400"> {state.interim}</span> : null}
            </p>
          ) : (
            <p className="text-sm text-zinc-500">
              Try: <span className="text-zinc-400">&quot;Hilux full, client Sipho, deposit five hundred&quot;</span>
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={speech.toggleManual}
            aria-expanded={showManual}
            className="min-h-[44px] border border-zinc-700 px-3 text-sm text-zinc-100"
            data-testid="toggle-manual"
          >
            {showManual ? "Hide typing" : "Type instead"}
          </button>
          {transcript ? (
            <button type="button" onClick={onClear} className="min-h-[44px] px-3 text-sm text-zinc-300 underline">
              Clear
            </button>
          ) : null}
        </div>

        {showManual ? (
          <div className="mt-3">
            <label htmlFor="f-transcript" className="block text-sm text-zinc-300">
              Type or paste the job
            </label>
            <textarea
              id="f-transcript"
              data-testid="manual-transcript"
              rows={3}
              value={transcript}
              maxLength={1000}
              onChange={(event) => onTranscriptChange(event.target.value)}
              className="field-input mt-1 min-h-[96px] resize-y"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
