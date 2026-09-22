"use client";

import { logoutAction } from "@/app/actions/auth";
import { clearDeviceData } from "@/lib/pwa";

export function LogoutButton() {
  return (
    <form action={logoutAction} onSubmit={() => clearDeviceData()}>
      <button
        type="submit"
        className="min-h-[44px] min-w-[48px] border border-hawk-obsidian-border px-4 text-sm text-zinc-200 hover:border-hawk-crimson"
      >
        Sign out
      </button>
    </form>
  );
}
