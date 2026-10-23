import { NextResponse } from "next/server";

import { isSssConfigured } from "@/lib/sss";
import { firstTime, recordWhatsappClick } from "@/lib/stats";

/** A WhatsApp button was tapped (order, restock or contact). Sent with navigator.sendBeacon. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { intent?: unknown; product?: unknown } | null;
  const intent = body?.intent === "order" || body?.intent === "restock" ? body.intent : "contact";
  const product = typeof body?.product === "string" && /^[\w-]{1,64}$/.test(body.product) ? body.product : null;
  if (!isSssConfigured()) return NextResponse.json({ ok: false });
  if (!firstTime(request, `wa:${intent}:${product ?? ""}`)) return NextResponse.json({ ok: true });
  try {
    await recordWhatsappClick(intent === "contact" ? null : product);
  } catch (error) {
    console.error("[track]", error);
  }
  return NextResponse.json({ ok: true });
}
