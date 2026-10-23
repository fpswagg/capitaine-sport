import { NextResponse, type NextRequest } from "next/server";

/** Tells the dashboard which page is open (to come back to it after a token refresh). */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/dashboard", "/dashboard/:path*"] };
