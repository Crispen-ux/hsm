export function logError(scope: string, error: unknown): void {
  const name = error instanceof Error ? error.name : "UnknownError";
  const message = error instanceof Error ? error.message : "Non-error thrown";
  const code =
    typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
      ? error.code
      : undefined;
  console.error(JSON.stringify({ level: "error", scope, name, code, message }));
}
