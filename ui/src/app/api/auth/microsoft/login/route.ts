import { NextResponse } from "next/server";
import {
  createOAuthState,
  createPkceChallenge,
  createPkceVerifier,
  getBaseUrl,
  getMicrosoftAuthorizeUrl,
  getSafeCallbackUrl,
  setAuthFlowCookies,
} from "@/lib/microsoft-auth";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const callbackUrl = getSafeCallbackUrl(url.searchParams.get("callbackUrl"));
  if (env.E2E_MODE) {
    const e2eUrl = new URL("/e2e/auth", getBaseUrl(request));
    e2eUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(e2eUrl);
  }
  const state = await createOAuthState();
  const verifier = await createPkceVerifier();
  const challenge = await createPkceChallenge(verifier);

  const response = NextResponse.redirect(
    getMicrosoftAuthorizeUrl(request, state, challenge)
  );
  const _cookies = await cookies();
  setAuthFlowCookies(_cookies, {
    state,
    verifier,
    callbackUrl,
  });
  return response;
}
