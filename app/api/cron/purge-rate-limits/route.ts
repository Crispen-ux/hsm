import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { purgeExpiredBuckets } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const purged = await purgeExpiredBuckets(db, oneHourAgo);

  return NextResponse.json({ purged });
}
