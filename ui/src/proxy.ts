import { cookies } from "next/headers";
import { NextResponse, NextRequest } from "next/server";
import {
  AUTH_ENCRYPTED_REFRESH_COOKIE,
  AUTH_SESSION_COOKIE,
  MicrosoftSessionSchema,
} from "./lib/microsoft-auth";

// Fast parsing, we cannot rely on the crypto library in proxy.
function parseJwt(token: string) {
  const base64Url = token.split(".")[1];
  if (!base64Url) {
    throw new Error("Invalid JWT");
  }
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "="
  );
  // Edge middleware has no `window`; `atob` is available on the global object.
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

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
  // Parse session cookie
  try {
    const jsonSession = parseJwt(session.value);

    const sessionParsed = MicrosoftSessionSchema.parse(jsonSession);
    if (
      request.nextUrl.pathname === "/" &&
      sessionParsed.accountSetup.type === "complete"
    ) {
      return NextResponse.redirect(new URL("/swap", request.url));
    }
    if (
      request.nextUrl.pathname === "/swap" &&
      sessionParsed.accountSetup.type !== "complete"
    ) {
      return NextResponse.redirect(new URL("/onboard", request.url));
    }
    if (
      request.nextUrl.pathname === "/onboard" &&
      sessionParsed.accountSetup.type === "complete"
    ) {
      return NextResponse.redirect(new URL("/swap", request.url));
    }
  } catch (error) {
    console.error(error);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/onboard", "/swap/:path*", "/swap"],
};
