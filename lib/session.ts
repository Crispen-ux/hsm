import type { Role } from "@/lib/domain";
import { auth } from "@/lib/auth";

export interface SessionUser {
  id: string;
  role: Role;
  name: string;
  email: string;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.role) {
    return null;
  }
  return { id: user.id, role: user.role, name: user.name ?? "Crew", email: user.email ?? "" };
}
