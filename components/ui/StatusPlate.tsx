import { cn } from "@/lib/cn";

type Tone = "open" | "closed" | "info";

const TONE_DOT: Readonly<Record<Tone, string>> = {
  open: "bg-emerald-400",
  closed: "bg-zinc-500",
  info: "bg-hawk-gold",
};

export function StatusPlate({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span className="chamfer inline-flex items-center gap-2 border border-hawk-obsidian-border bg-hawk-obsidian-card px-3 py-1 text-sm text-zinc-200">
      <span className={cn("h-1.5 w-1.5 rounded-full", TONE_DOT[tone])} aria-hidden />
      {label}
    </span>
  );
}
