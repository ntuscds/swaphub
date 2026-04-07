import { cookies } from "next/headers";
import { NextResponse, NextRequest } from "next/server";
import {
  AUTH_ENCRYPTED_REFRESH_COOKIE,
  AUTH_SESSION_COOKIE,
} from "./lib/microsoft-auth";

export async function proxy(request: NextRequest) {
  const _cookies = await cookies();
  const refreshToken = _cookies.get(AUTH_ENCRYPTED_REFRESH_COOKIE);
  const session = _cookies.get(AUTH_SESSION_COOKIE);
  if (!refreshToken) {
    // Check if /onboard is the current path
    if (request.nextUrl.pathname === "/onboard") {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/onboard", request.url));
  }
  if (!session) {
    const refreshUrl = "/api/auth/refresh";
    // Should not happen, but just in case.
    if (request.nextUrl.pathname === refreshUrl) {
      return NextResponse.next();
    }
    const encodedRedirectUrl = encodeURIComponent(request.nextUrl.toString());
    return NextResponse.redirect(
      new URL(`${refreshUrl}?redirect=${encodedRedirectUrl}`, request.url)
    );
  }
  // If '/' is used, redirect to /swap. Should not happen.
  // Set it in the next.config.ts instead.
  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/swap", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/onboard", "/swap/:path*", "/swap"],
};
