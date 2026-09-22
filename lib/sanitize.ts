const HTML_TAG = /<[^>]*>/g;
const ANGLE_BRACKETS = /[<>]/g;
const INVISIBLE = /[\u200B-\u200D\u2060\uFEFF]/g;
const CONTROL = /[\u0000-\u001F\u007F-\u009F]/g;
const WHITESPACE_RUN = /\s+/g;

export function sanitizeText(input: string): string {
  return input
    .normalize("NFKC")
    .replace(HTML_TAG, " ")
    .replace(ANGLE_BRACKETS, "")
    .replace(INVISIBLE, "")
    .replace(CONTROL, " ")
    .replace(WHITESPACE_RUN, " ")
    .trim();
}
