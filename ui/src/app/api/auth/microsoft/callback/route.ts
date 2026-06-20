import { NextResponse } from "next/server";
import {
  AUTH_ENCRYPTED_REFRESH_COOKIE,
  AUTH_SESSION_COOKIE,
  AUTH_STATE_COOKIE,
  AUTH_VERIFIER_COOKIE,
  buildSession,
  clearAuthFlowCookies,
  exchangeMicrosoftCode,
  fetchMicrosoftUser,
  getAccountSetup,
  getAuthCookies,
  getBaseUrl,
  getSafeCallbackUrl,
  setRefreshTokenCookie,
  setSessionCookie,
} from "@/lib/microsoft-auth";
import { cookies } from "next/headers";
import { ALLOWED_DOMAINS } from "@/lib/user";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");
  const _cookies = await cookies();
  const authCookies = getAuthCookies(_cookies);

  if (error) {
    const response = NextResponse.redirect(
      new URL(
        `/onboard?error=${encodeURIComponent(error)}`,
        getBaseUrl(request)
      )
    );
    _cookies.delete(AUTH_STATE_COOKIE);
    _cookies.delete(AUTH_VERIFIER_COOKIE);
    _cookies.delete(AUTH_SESSION_COOKIE);
    // clearAuthFlowCookies(response.headers, request);
    // clearSessionCookie(response.headers, request);
    // clearRefreshTokenCookie(response.headers, request);
    return response;
  }

  if (
    !code ||
    !state ||
    !authCookies.state ||
    !authCookies.verifier ||
    state !== authCookies.state
  ) {
    const response = NextResponse.redirect(
      new URL("/onboard?error=invalid_state", getBaseUrl(request))
    );
    _cookies.delete(AUTH_STATE_COOKIE);
    _cookies.delete(AUTH_VERIFIER_COOKIE);
    _cookies.delete(AUTH_SESSION_COOKIE);
    // clearAuthFlowCookies(response.headers, request);
    // clearSessionCookie(response.headers, request);
    // clearRefreshTokenCookie(response.headers, request);
    return response;
  }

  try {
    const exchanged = await exchangeMicrosoftCode(
      request,
      code,
      authCookies.verifier
    );
    const profile = await fetchMicrosoftUser(exchanged.access_token);

    // Verify email domain.
    const isAllowedDomain = ALLOWED_DOMAINS.some((domain) =>
      profile.email.endsWith(domain)
    );
    if (!isAllowedDomain) {
      return NextResponse.redirect(
        new URL("/onboard?error=email_not_allowed", getBaseUrl(request))
      );
    }

    const accountSetup = await getAccountSetup(profile.email);
    const session = await buildSession(
      profile,
      exchanged.expires_in,
      accountSetup
    );
    const callbackUrl = getSafeCallbackUrl(authCookies.callback);

    const response = NextResponse.redirect(
      new URL(callbackUrl, getBaseUrl(request))
    );
    clearAuthFlowCookies(_cookies);
    await setSessionCookie(_cookies, session);
    if (exchanged.refresh_token) {
      await setRefreshTokenCookie(_cookies, exchanged.refresh_token);
    } else {
      _cookies.delete(AUTH_ENCRYPTED_REFRESH_COOKIE);
      // clearRefreshTokenCookie(response.headers, request);
    }
    return response;
  } catch (error) {
    console.error(error);
    const response = NextResponse.redirect(
      new URL("/onboard?error=auth_failed", getBaseUrl(request))
    );
    _cookies.delete(AUTH_STATE_COOKIE);
    _cookies.delete(AUTH_VERIFIER_COOKIE);
    _cookies.delete(AUTH_SESSION_COOKIE);
    return response;
  }
}
