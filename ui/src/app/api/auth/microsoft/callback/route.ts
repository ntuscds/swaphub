import { NextResponse } from "next/server";
import {
  buildSession,
  clearAuthFlowCookies,
  clearRefreshTokenCookie,
  clearSessionCookie,
  exchangeMicrosoftCode,
  fetchMicrosoftUser,
  getAccountSetup,
  getAuthCookies,
  getBaseUrl,
  getSafeCallbackUrl,
  setRefreshTokenCookie,
  setSessionCookie,
} from "@/lib/microsoft-auth";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");
  const cookies = getAuthCookies(request);

  if (error) {
    const response = NextResponse.redirect(
      new URL(
        `/onboard?error=${encodeURIComponent(error)}`,
        getBaseUrl(request)
      )
    );
    clearAuthFlowCookies(response.headers, request);
    clearSessionCookie(response.headers, request);
    clearRefreshTokenCookie(response.headers, request);
    return response;
  }

  if (
    !code ||
    !state ||
    !cookies.state ||
    !cookies.verifier ||
    state !== cookies.state
  ) {
    const response = NextResponse.redirect(
      new URL("/onboard?error=invalid_state", getBaseUrl(request))
    );
    clearAuthFlowCookies(response.headers, request);
    clearSessionCookie(response.headers, request);
    clearRefreshTokenCookie(response.headers, request);
    return response;
  }

  try {
    const exchanged = await exchangeMicrosoftCode(
      request,
      code,
      cookies.verifier
    );
    const profile = await fetchMicrosoftUser(exchanged.access_token);
    const accountSetup = await getAccountSetup(profile.email);
    const session = await buildSession(
      profile,
      exchanged.expires_in,
      accountSetup
    );
    const callbackUrl = getSafeCallbackUrl(cookies.callback);

    const response = NextResponse.redirect(
      new URL(callbackUrl, getBaseUrl(request))
    );
    clearAuthFlowCookies(response.headers, request);
    await setSessionCookie(response.headers, request, session);
    if (exchanged.refresh_token) {
      await setRefreshTokenCookie(
        response.headers,
        request,
        exchanged.refresh_token
      );
    } else {
      clearRefreshTokenCookie(response.headers, request);
    }
    return response;
  } catch {
    const response = NextResponse.redirect(
      new URL("/onboard?error=auth_failed", getBaseUrl(request))
    );
    clearAuthFlowCookies(response.headers, request);
    clearSessionCookie(response.headers, request);
    clearRefreshTokenCookie(response.headers, request);
    return response;
  }
}
