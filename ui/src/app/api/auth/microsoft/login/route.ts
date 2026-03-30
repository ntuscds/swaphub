import { NextResponse } from "next/server";
import {
  createOAuthState,
  createPkceChallenge,
  createPkceVerifier,
  getMicrosoftAuthorizeUrl,
  getSafeCallbackUrl,
  setAuthFlowCookies,
} from "@/lib/microsoft-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const callbackUrl = getSafeCallbackUrl(url.searchParams.get("callbackUrl"));
  const state = await createOAuthState();
  const verifier = await createPkceVerifier();
  const challenge = await createPkceChallenge(verifier);

  const response = NextResponse.redirect(
    getMicrosoftAuthorizeUrl(request, state, challenge)
  );
  setAuthFlowCookies(response.headers, request, {
    state,
    verifier,
    callbackUrl,
  });
  return response;
}
