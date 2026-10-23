import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { authProblem, startSignIn } from "@/lib/sss-auth";

/** "Sign in with SSS" button → here → SSS asks the visitor → /auth/sss/callback. */
export async function GET(request: Request) {
  if (authProblem()) return NextResponse.redirect(new URL("/dashboard", config.siteUrl));
  const next = new URL(request.url).searchParams.get("next");
  return NextResponse.redirect(await startSignIn(next));
}

export const dynamic = "force-dynamic";
