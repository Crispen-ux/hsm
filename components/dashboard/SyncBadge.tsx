import { cn } from "@/lib/cn";

interface SyncBadgeProps {
  online: boolean;
  pendingCount: number;
  syncing: boolean;
  needsSignIn: boolean;
}

export function SyncBadge({ online, pendingCount, syncing, needsSignIn }: SyncBadgeProps) {
  let label = "Online";
  let hazard = false;

  if (needsSignIn) {
    label = "Sign in to sync";
    hazard = true;
  } else if (!online) {
    label = pendingCount > 0 ? `Offline, ${pendingCount} waiting` : "Offline";
    hazard = true;
  } else if (syncing) {
    label = "Syncing";
    hazard = true;
  } else if (pendingCount > 0) {
    label = `${pendingCount} waiting to sync`;
    hazard = true;
  }

  return (
    <span
      role="status"
      aria-live="polite"
      data-testid="sync-badge"
      className="chamfer inline-flex min-h-[36px] items-center gap-2 border border-hawk-obsidian-border bg-hawk-obsidian-card px-3 text-sm text-zinc-100"
    >
      <span className={cn("h-2 w-2 rounded-full", hazard ? "bg-hawk-gold" : "bg-emerald-400")} aria-hidden />
      {label}
    </span>
  );
}
