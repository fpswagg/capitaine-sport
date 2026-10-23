import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { getAccessToken, safeNext } from "@/lib/sss-auth";

/**
 * Pages cannot set cookies: when the access token ran out, the dashboard sends the
 * visitor here, the token is refreshed (new pair saved) and they go back where they were.
 */
export async function GET(request: Request) {
  const next = safeNext(new URL(request.url).searchParams.get("next"));
  const token = await getAccessToken();
  return NextResponse.redirect(new URL(token ? next : "/dashboard?error=expired", config.siteUrl));
}

export const dynamic = "force-dynamic";
