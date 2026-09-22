import { describe, expect, it } from "vitest";
import { highlightTranscript } from "@/lib/highlight";
import { parseSpeech } from "@/lib/speech-parser";

describe("highlightTranscript", () => {
  it("marks matched words in the original text and keeps the rest", () => {
    const transcript = "Hilux full, client Sipho";
    const segments = highlightTranscript(transcript, parseSpeech(transcript).spans);
    expect(segments.map((segment) => segment.text).join("")).toBe(transcript);
    const kinds = segments.filter((segment) => segment.kind !== null).map((segment) => [segment.text, segment.kind]);
    expect(kinds).toContainEqual(["Hilux", "vehicle"]);
    expect(kinds).toContainEqual(["full", "tier"]);
  });

  it("never reorders or drops characters, even with overlapping spans", () => {
    const transcript = "full shell floor";
    const segments = highlightTranscript(transcript, [
      { kind: "scope", text: "full shell" },
      { kind: "scope", text: "shell floor" },
    ]);
    expect(segments.map((segment) => segment.text).join("")).toBe(transcript);
  });

  it("ignores spans that only exist after normalisation", () => {
    const segments = highlightTranscript("forty foot", [{ kind: "size", text: "40 foot" }]);
    expect(segments).toEqual([{ text: "forty foot", kind: null }]);
  });

  it("handles empty input and regex characters safely", () => {
    expect(highlightTranscript("", [{ kind: "name", text: "x" }])).toEqual([]);
    expect(() => highlightTranscript("a (b) [c]", [{ kind: "name", text: "(b) [c]" }])).not.toThrow();
  });
});
