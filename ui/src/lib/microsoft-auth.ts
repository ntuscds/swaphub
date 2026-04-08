import { env } from "@/lib/env";
import { base64UrlEncode, decryptValue, encryptValue } from "@/lib/encrypt";
import { cookies } from "next/headers";
import {
  sign as jwtSign,
  verify as jwtVerify,
  type JwtPayload,
} from "jsonwebtoken";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../convex/_generated/api";
import z from "zod";
import { cache } from "react";

export const MICROSOFT_AUTH_BASE_PATH = "/api/auth/microsoft";
export const MICROSOFT_SCOPE = "openid profile email offline_access";
export const AUTH_STATE_COOKIE = "microsoft_auth_state";
export const AUTH_VERIFIER_COOKIE = "microsoft_auth_verifier";
export const AUTH_CALLBACK_COOKIE = "microsoft_auth_callback";
export const AUTH_SESSION_COOKIE = "microsoft_auth_session";
export const AUTH_ENCRYPTED_REFRESH_COOKIE = "microsoft_auth_refresh";
// const TEN_MINUTES_IN_SECONDS = 60 * 10;
// const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30;
const SESSION_MAX_AGE_IN_SECONDS = 10 * 60;
const REFRESH_TOKEN_MAX_AGE_IN_SECONDS = 60 * 24 * 60 * 60;
const ACCESS_TOKEN_MAX_AGE_IN_SECONDS = SESSION_MAX_AGE_IN_SECONDS;

const MicrosoftUserInfoSchema = z.object({
  sub: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  picture: z.string().nullable(),
});

export type MicrosoftUserInfo = z.infer<typeof MicrosoftUserInfoSchema>;

const MicrosoftSessionSeedSchema = z.object({
  sub: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  picture: z.string().nullable(),
});

export type MicrosoftSessionSeed = z.infer<typeof MicrosoftSessionSeedSchema>;

const MicrosoftSessionSchema = z.object({
  sub: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  picture: z.string().nullable(),
  expiresAt: z.number(),
  accountSetup: z.enum([
    "not_setup",
    "telegram_not_setup",
    "school_not_setup",
    "complete",
  ]),
});

export type MicrosoftSession = z.infer<typeof MicrosoftSessionSchema>;
// export type MicrosoftSession = {
//   sub: string;
//   email: string | null;
//   name: string | null;
//   picture: string | null;
//   expiresAt: number;
//   accountSetup?:
//     | "not_setup"
//     | "telegram_not_setup"
//     | "school_not_setup"
//     | "complete";
// };

export function getBaseUrl(request: Request) {
  const url = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const protocol = forwardedProto ?? url.protocol.replace(":", "");
  const host = forwardedHost ?? request.headers.get("host") ?? url.host;
  return `${protocol}://${host}`;
}

export function getMicrosoftCallbackUrl(request: Request) {
  return `${getBaseUrl(request)}${MICROSOFT_AUTH_BASE_PATH}/callback`;
}

export function getMicrosoftAuthorizeUrl(
  request: Request,
  state: string,
  codeChallenge: string
) {
  const url = new URL(
    `https://login.microsoftonline.com/${env.AZURE_AD_TENANT_ID}/oauth2/v2.0/authorize`
  );
  url.searchParams.set("client_id", env.AZURE_AD_CLIENT_ID);
  url.searchParams.set("redirect_uri", getMicrosoftCallbackUrl(request));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", MICROSOFT_SCOPE);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export async function exchangeMicrosoftCode(
  request: Request,
  code: string,
  verifier: string
) {
  const response = await fetch(
    `https://login.microsoftonline.com/${env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: env.AZURE_AD_CLIENT_ID,
        client_secret: env.AZURE_AD_CLIENT_SECRET,
        code,
        code_verifier: verifier,
        grant_type: "authorization_code",
        redirect_uri: getMicrosoftCallbackUrl(request),
      }).toString(),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to exchange Microsoft authorization code");
  }

  return (await response.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };
}

export async function refreshMicrosoftAccessToken(refreshToken: string) {
  const response = await fetch(
    `https://login.microsoftonline.com/${env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: env.AZURE_AD_CLIENT_ID,
        client_secret: env.AZURE_AD_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        scope: "openid profile offline_access User.Read",
      }).toString(),
    }
  );

  if (!response.ok) {
    console.error(await response.text());
    throw new Error("Failed to refresh Microsoft access token");
  }

  return (await response.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };
}

export async function fetchMicrosoftUser(accessToken: string) {
  // const [_userInfoResponse, _profilePictureResponse] = await Promise.allSettled(
  //   [
  //     fetch("https://graph.microsoft.com/oidc/userinfo", {
  //       headers: {
  //         Authorization: `Bearer ${accessToken}`,
  //       },
  //       cache: "no-store",
  //     }),
  //     fetch(`https://graph.microsoft.com/v1.0/me/photos/48x48`, {
  //       headers: {
  //         Authorization: `Bearer ${accessToken}`,
  //       },
  //       cache: "no-store",
  //     }),
  //   ]
  // );
  const userInfoResponse = await fetch(
    "https://graph.microsoft.com/oidc/userinfo",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  if (!userInfoResponse.ok) {
    throw new Error("Failed to fetch Microsoft user profile");
  }

  const profile = await userInfoResponse.json();
  const parsed = MicrosoftUserInfoSchema.parse(profile);

  return parsed;
}

export function getSafeCallbackUrl(input: string | null | undefined) {
  if (!input) return "/onboard";
  if (input.startsWith("/") && !input.startsWith("//")) return input;

  try {
    const url = new URL(input);
    return `${url.pathname}${url.search}${url.hash}` || "/onboard";
  } catch {
    return "/onboard";
  }
}

export function getAuthCookies(_cookies: Awaited<ReturnType<typeof cookies>>) {
  return {
    state: _cookies.get(AUTH_STATE_COOKIE)?.value ?? null,
    verifier: _cookies.get(AUTH_VERIFIER_COOKIE)?.value ?? null,
    callback: _cookies.get(AUTH_CALLBACK_COOKIE)?.value ?? null,
    session: _cookies.get(AUTH_SESSION_COOKIE)?.value ?? null,
    refresh: _cookies.get(AUTH_ENCRYPTED_REFRESH_COOKIE)?.value ?? null,
  };
}

export function setAuthFlowCookies(
  _cookies: Awaited<ReturnType<typeof cookies>>,
  input: { state: string; verifier: string; callbackUrl: string }
) {
  _cookies.set(AUTH_STATE_COOKIE, input.state, {
    maxAge: SESSION_MAX_AGE_IN_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    secure: env.SECURE_COOKIES,
  });
  _cookies.set(AUTH_VERIFIER_COOKIE, input.verifier, {
    maxAge: SESSION_MAX_AGE_IN_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    secure: env.SECURE_COOKIES,
  });
  _cookies.set(AUTH_CALLBACK_COOKIE, input.callbackUrl, {
    maxAge: SESSION_MAX_AGE_IN_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    secure: env.SECURE_COOKIES,
  });
}

export function clearAuthFlowCookies(
  _cookies: Awaited<ReturnType<typeof cookies>>
) {
  _cookies.delete(AUTH_STATE_COOKIE);
  _cookies.delete(AUTH_VERIFIER_COOKIE);
  _cookies.delete(AUTH_CALLBACK_COOKIE);
}

export async function setSessionCookie(
  _cookies: Awaited<ReturnType<typeof cookies>>,
  session: MicrosoftSession
) {
  const signed = await signSession(session);
  _cookies.set(AUTH_SESSION_COOKIE, signed, {
    maxAge: SESSION_MAX_AGE_IN_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    secure: env.SECURE_COOKIES,
  });
}

export async function setRefreshTokenCookie(
  _cookies: Awaited<ReturnType<typeof cookies>>,
  refreshToken: string
) {
  const encrypted = await encryptValue(refreshToken, env.ENCRYPTION_KEY);
  _cookies.set(AUTH_ENCRYPTED_REFRESH_COOKIE, encrypted, {
    maxAge: REFRESH_TOKEN_MAX_AGE_IN_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    secure: env.SECURE_COOKIES,
  });
}

export async function buildSession(
  profile: MicrosoftSessionSeed,
  expiresIn: number,
  accountSetup: MicrosoftSession["accountSetup"]
) {
  return {
    sub: profile.sub!,
    email: profile.email,
    name: profile.name ?? null,
    picture: profile.picture ?? null,
    expiresAt:
      Date.now() + Math.min(expiresIn, ACCESS_TOKEN_MAX_AGE_IN_SECONDS) * 1000,
    accountSetup: accountSetup,
  } satisfies MicrosoftSession;
}

export async function createOAuthState() {
  return crypto.randomUUID();
}

export async function createPkceVerifier() {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
}

export async function createPkceChallenge(verifier: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  return base64UrlEncode(new Uint8Array(digest));
}

export async function signSession(session: MicrosoftSession) {
  return jwtSign(session, env.ENCRYPTION_KEY, {
    algorithm: "HS256",
    expiresIn: ACCESS_TOKEN_MAX_AGE_IN_SECONDS,
  });
}

function fromJwtPayloadToSession(
  payload: JwtPayload | string
): MicrosoftSession | null {
  if (!payload || typeof payload === "string") return null;

  const parsed = MicrosoftSessionSchema.parse(payload);
  return parsed;
}

export async function verifySession(
  raw: string,
  options?: { allowExpired?: boolean }
) {
  try {
    const payload = jwtVerify(raw, env.ENCRYPTION_KEY, {
      // algorithms: ["RS256"],
      algorithms: ["HS256"],
      ignoreExpiration: Boolean(options?.allowExpired),
    });
    const session = fromJwtPayloadToSession(payload);
    if (!session) {
      return null;
    }
    if (!options?.allowExpired && session.expiresAt <= Date.now()) {
      return null;
    }
    return session;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function _getAuth() {
  const _cookies = await cookies();
  const sessionInCookie = _cookies.get(AUTH_SESSION_COOKIE);
  const refreshTokenInCookie = _cookies.get(AUTH_ENCRYPTED_REFRESH_COOKIE);
  let result: {
    name: string | null;
    email: string;
    accountSetup: MicrosoftSession["accountSetup"];
  } | null = null;
  if (!refreshTokenInCookie) {
    return null;
  }
  if (sessionInCookie) {
    const verifiedSession = await verifySession(sessionInCookie.value);
    if (verifiedSession) {
      result = {
        name: verifiedSession.name,
        email: verifiedSession.email,
        accountSetup: verifiedSession.accountSetup,
      };
    }
  } else {
    if (refreshTokenInCookie) {
      const decryptedRefreshToken = await decryptValue(
        refreshTokenInCookie.value,
        env.ENCRYPTION_KEY
      );
      const refreshed = await refreshMicrosoftAccessToken(
        decryptedRefreshToken
      );
      const profile = await fetchMicrosoftUser(refreshed.access_token);

      const accountSetup = await getAccountSetup(profile.email);

      const currentSession = await buildSession(
        profile,
        refreshed.expires_in,
        accountSetup
      );
      result = {
        name: currentSession.name,
        email: currentSession.email,
        accountSetup: currentSession.accountSetup,
      };
    }
  }
  return result;
}

export const getAuth = cache(_getAuth);

export async function refreshSession(
  _cookies: Awaited<ReturnType<typeof cookies>>
) {
  const authCookies = getAuthCookies(_cookies);
  if (!authCookies.refresh) {
    _cookies.delete(AUTH_SESSION_COOKIE);
    _cookies.delete(AUTH_ENCRYPTED_REFRESH_COOKIE);
    return null;
  }
  try {
    const decryptedRefreshToken = await decryptValue(
      authCookies.refresh,
      env.ENCRYPTION_KEY
    );
    const refreshed = await refreshMicrosoftAccessToken(decryptedRefreshToken);
    const profile = await fetchMicrosoftUser(refreshed.access_token);
    const accountSetup = await getAccountSetup(profile.email);
    const currentSession = await buildSession(
      profile,
      refreshed.expires_in,
      accountSetup
    );
    setSessionCookie(_cookies, currentSession);
    setRefreshTokenCookie(
      _cookies,
      refreshed.refresh_token ?? authCookies.refresh
    );
    // _cookies.set(AUTH_SESSION_COOKIE, await signSession(currentSession));
    // _cookies.set(
    //   AUTH_ENCRYPTED_REFRESH_COOKIE,
    //   await encryptValue(refreshed.refresh_token ?? authCookies.refresh)
    // );
    return currentSession;
  } catch (error) {
    console.error(error);
    _cookies.delete(AUTH_SESSION_COOKIE);
    _cookies.delete(AUTH_ENCRYPTED_REFRESH_COOKIE);
    return null;
  }
}

export async function readSessionWithRefresh(
  _cookies: Awaited<ReturnType<typeof cookies>>
) {
  const authCookies = getAuthCookies(_cookies);
  if (!authCookies.refresh) {
    _cookies.delete(AUTH_SESSION_COOKIE);
    _cookies.delete(AUTH_ENCRYPTED_REFRESH_COOKIE);
    return null;
  }

  if (authCookies.session) {
    let currentSession = await verifySession(authCookies.session);
    if (currentSession) {
      return currentSession;
    }
  }

  return await refreshSession(_cookies);
}

export async function getAccountSetup(email: string) {
  return fetchQuery(api.tasks.getAccountSetup, {
    email: email,
  });
}
