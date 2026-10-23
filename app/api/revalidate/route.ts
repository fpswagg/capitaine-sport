import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

/** POST /api/revalidate?secret=… shows SSS edits at once (e.g. after a change in the SSS app). */
export async function POST(request: Request) {
  const expected = (process.env.REVALIDATE_SECRET ?? "").trim();
  const given = new URL(request.url).searchParams.get("secret") ?? request.headers.get("x-revalidate-secret") ?? "";
  if (!expected || given !== expected) return NextResponse.json({ ok: false }, { status: 401 });
  revalidateTag("sss", { expire: 0 });
  return NextResponse.json({ ok: true });
}
