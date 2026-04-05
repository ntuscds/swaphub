import { NextResponse } from "next/server";
import {
  createOAuthState,
  createPkceChallenge,
  createPkceVerifier,
  getMicrosoftAuthorizeUrl,
  getSafeCallbackUrl,
  setAuthFlowCookies,
} from "@/lib/microsoft-auth";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const callbackUrl = getSafeCallbackUrl(url.searchParams.get("callbackUrl"));
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
