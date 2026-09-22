"use client";

import { useEffect, useState } from "react";

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
}

function isInstallEvent(event: Event): event is InstallEvent {
  return "prompt" in event && typeof event.prompt === "function";
}

export function InstallPrompt() {
  const [pending, setPending] = useState<InstallEvent | null>(null);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      if (isInstallEvent(event)) {
        event.preventDefault();
        setPending(event);
      }
    };
    const onInstalled = () => setPending(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!pending) {
    return null;
  }
  return (
    <button
      type="button"
      onClick={() => {
        void pending.prompt().finally(() => setPending(null));
      }}
      className="min-h-[44px] border border-hawk-obsidian-border px-3 text-sm text-zinc-100"
    >
      Install app
    </button>
  );
}
