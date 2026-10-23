import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { finishSignIn, SssAuthError } from "@/lib/sss-auth";

/** SSS sends the visitor back here with ?code=…&state=… (or ?error=…). */
export async function GET(request: Request) {
  try {
    const next = await finishSignIn(new URL(request.url).searchParams);
    return NextResponse.redirect(new URL(next, config.siteUrl));
  } catch (err) {
    const code = err instanceof SssAuthError ? err.code : "server_error";
    if (!(err instanceof SssAuthError)) console.error("[sign in with SSS]", err);
    return NextResponse.redirect(new URL(`/dashboard?error=${encodeURIComponent(code)}`, config.siteUrl));
  }
}

export const dynamic = "force-dynamic";
