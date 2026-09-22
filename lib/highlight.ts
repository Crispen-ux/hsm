import type { ParsedSpan } from "@/lib/validations";

export interface TranscriptSegment {
  text: string;
  kind: ParsedSpan["kind"] | null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function highlightTranscript(transcript: string, spans: readonly ParsedSpan[]): TranscriptSegment[] {
  if (transcript === "") {
    return [];
  }
  const marks: Array<{ start: number; end: number; kind: ParsedSpan["kind"] }> = [];

  for (const span of spans) {
    const needle = span.text.trim();
    if (needle.length < 2) {
      continue;
    }
    const pattern = new RegExp(escapeRegExp(needle).replace(/\s+/g, "\\s+"), "i");
    const match = pattern.exec(transcript);
    if (!match) {
      continue;
    }
    const start = match.index;
    const end = start + match[0].length;
    if (marks.every((mark) => end <= mark.start || start >= mark.end)) {
      marks.push({ start, end, kind: span.kind });
    }
  }

  marks.sort((a, b) => a.start - b.start);
  const segments: TranscriptSegment[] = [];
  let cursor = 0;
  for (const mark of marks) {
    if (mark.start > cursor) {
      segments.push({ text: transcript.slice(cursor, mark.start), kind: null });
    }
    segments.push({ text: transcript.slice(mark.start, mark.end), kind: mark.kind });
    cursor = mark.end;
  }
  if (cursor < transcript.length) {
    segments.push({ text: transcript.slice(cursor), kind: null });
  }
  return segments;
}
