import {
  getBaseUrl,
  getSafeCallbackUrl,
  refreshSession,
} from "@/lib/microsoft-auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const redirectUrl = getSafeCallbackUrl(
    requestUrl.searchParams.get("redirect") ?? "/"
  );
  const _cookies = await cookies();
  const canonicalOrigin = getBaseUrl(request);
  const session = await refreshSession(_cookies);
  if (session) {
    const response = NextResponse.redirect(
      new URL(redirectUrl, canonicalOrigin)
    );
    return response;
  }
  const response = NextResponse.redirect(new URL("/onboard", canonicalOrigin));
  return response;
}
