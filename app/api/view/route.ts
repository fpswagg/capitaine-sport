import { NextResponse } from "next/server";

import { isSssConfigured } from "@/lib/sss";
import { firstTime, recordProductView } from "@/lib/stats";

/** A jersey page was opened (sent once per visit). Counted in the SSS product metadata. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id.slice(0, 64) : "";
  if (!id || !/^[\w-]+$/.test(id) || !isSssConfigured()) return NextResponse.json({ ok: false });
  if (!firstTime(request, `view:${id}`)) return NextResponse.json({ ok: true });
  try {
    await recordProductView(id);
  } catch (error) {
    console.error("[view]", error);
  }
  return NextResponse.json({ ok: true });
}
