import { NextResponse } from "next/server";
import {
  AUTH_ENCRYPTED_REFRESH_COOKIE,
  AUTH_SESSION_COOKIE,
  clearAuthFlowCookies,
  getBaseUrl,
  getSafeCallbackUrl,
} from "@/lib/microsoft-auth";
import { cookies } from "next/headers";

async function createLogoutResponse(request: Request) {
  const url = new URL(request.url);
  const callbackUrl = getSafeCallbackUrl(url.searchParams.get("callbackUrl"));
  const response = NextResponse.redirect(
    new URL(callbackUrl, getBaseUrl(request))
  );
  const _cookies = await cookies();
  clearAuthFlowCookies(_cookies);
  _cookies.delete(AUTH_SESSION_COOKIE);
  _cookies.delete(AUTH_ENCRYPTED_REFRESH_COOKIE);
  return response;
}

export async function GET(request: Request) {
  return await createLogoutResponse(request);
}

export async function POST(request: Request) {
  return await createLogoutResponse(request);
}
