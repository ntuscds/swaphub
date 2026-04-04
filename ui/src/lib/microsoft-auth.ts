import { env } from "@/lib/env";
import { cookies } from "next/headers";
import {
  sign as jwtSign,
  verify as jwtVerify,
  type JwtPayload,
} from "jsonwebtoken";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../convex/_generated/api";
import z from "zod";

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
  const response = await fetch("https://graph.microsoft.com/oidc/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Microsoft user profile");
  }

  const profile = await response.json();
  const parsed = MicrosoftUserInfoSchema.parse(profile);
  return parsed;
}

export function getSafeCallbackUrl(input: string | null | undefined) {
  if (!input) return "/";
  if (input.startsWith("/") && !input.startsWith("//")) return input;

  try {
    const url = new URL(input);
    return `${url.pathname}${url.search}${url.hash}` || "/";
  } catch {
    return "/";
  }
}

export function getAuthCookies(request: Request) {
  const cookies = parseCookies(request.headers.get("cookie"));
  return {
    state: cookies[AUTH_STATE_COOKIE] ?? null,
    verifier: cookies[AUTH_VERIFIER_COOKIE] ?? null,
    callback: cookies[AUTH_CALLBACK_COOKIE] ?? null,
    session: cookies[AUTH_SESSION_COOKIE] ?? null,
    refresh: cookies[AUTH_ENCRYPTED_REFRESH_COOKIE] ?? null,
  };
}

export function setAuthFlowCookies(
  headers: Headers,
  request: Request,
  input: { state: string; verifier: string; callbackUrl: string }
) {
  appendCookie(
    headers,
    AUTH_STATE_COOKIE,
    input.state,
    request,
    SESSION_MAX_AGE_IN_SECONDS
  );
  appendCookie(
    headers,
    AUTH_VERIFIER_COOKIE,
    input.verifier,
    request,
    SESSION_MAX_AGE_IN_SECONDS
  );
  appendCookie(
    headers,
    AUTH_CALLBACK_COOKIE,
    input.callbackUrl,
    request,
    SESSION_MAX_AGE_IN_SECONDS
  );
}

export function clearAuthFlowCookies(headers: Headers, request: Request) {
  appendCookie(headers, AUTH_STATE_COOKIE, "", request, 0);
  appendCookie(headers, AUTH_VERIFIER_COOKIE, "", request, 0);
  appendCookie(headers, AUTH_CALLBACK_COOKIE, "", request, 0);
}

export async function setSessionCookie(
  headers: Headers,
  request: Request,
  session: MicrosoftSession
) {
  const signed = await signSession(session);
  appendCookie(
    headers,
    AUTH_SESSION_COOKIE,
    signed,
    request,
    SESSION_MAX_AGE_IN_SECONDS
  );
}

export async function setRefreshTokenCookie(
  headers: Headers,
  request: Request,
  refreshToken: string
) {
  const encrypted = await encryptValue(refreshToken);
  appendCookie(
    headers,
    AUTH_ENCRYPTED_REFRESH_COOKIE,
    encrypted,
    request,
    REFRESH_TOKEN_MAX_AGE_IN_SECONDS
  );
}

export function clearSessionCookie(headers: Headers, request: Request) {
  appendCookie(headers, AUTH_SESSION_COOKIE, "", request, 0);
}

export function clearRefreshTokenCookie(headers: Headers, request: Request) {
  appendCookie(headers, AUTH_ENCRYPTED_REFRESH_COOKIE, "", request, 0);
}

export async function readSession(request: Request) {
  const raw = getAuthCookies(request).session;
  if (!raw) return null;
  return await verifySession(raw);
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

async function signSession(session: MicrosoftSession) {
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

  // const sub = typeof payload.sub === "string" ? payload.sub : null;
  // const email = typeof payload.email === "string" ? payload.email : null;
  // const name = typeof payload.name === "string" ? payload.name : null;
  // const picture = typeof payload.picture === "string" ? payload.picture : null;
  // const expiresAt =
  //   typeof payload.expiresAt === "number" ? payload.expiresAt : null;
  // const accountSetup =
  //   typeof payload.accountSetup === "string" ? payload.accountSetup : null;
  // if (!sub || expiresAt === null) return null;
  // return {
  //   sub,
  //   email,
  //   name,
  //   picture,
  //   expiresAt,
  //   accountSetup,
  // };
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

function parseCookies(cookieHeader: string | null) {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  for (const entry of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = entry.trim().split("=");
    if (!rawName) continue;
    cookies[rawName] = decodeURIComponent(rawValue.join("="));
  }

  return cookies;
}

function appendCookie(
  headers: Headers,
  name: string,
  value: string,
  request: Request,
  maxAge: number
) {
  const secure = isSecureRequest(request);
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];

  if (secure) {
    parts.push("Secure");
  }

  headers.append("Set-Cookie", parts.join("; "));
}

function isSecureRequest(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto === "https";
  }

  return new URL(request.url).protocol === "https:";
}

function base64UrlEncode(input: Uint8Array) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecodeToBytes(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const remainder = padded.length % 4;
  const withPadding =
    remainder === 0 ? padded : padded + "=".repeat(4 - remainder);
  return new Uint8Array(Buffer.from(withPadding, "base64"));
}

async function getAesKey() {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(env.ENCRYPTION_KEY)
  );
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

async function encryptValue(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getAesKey();
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(value)
  );
  return `${base64UrlEncode(iv)}.${base64UrlEncode(new Uint8Array(encrypted))}`;
}

export async function decryptValue(input: string) {
  const [rawIv, rawCiphertext] = input.split(".");
  if (!rawIv || !rawCiphertext) {
    throw new Error("Invalid encrypted value format");
  }

  const iv = base64UrlDecodeToBytes(rawIv);
  const ciphertext = base64UrlDecodeToBytes(rawCiphertext);
  const key = await getAesKey();
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
}

export async function getAuth() {
  const _cookies = await cookies();
  const sessionInCookie = _cookies.get(AUTH_SESSION_COOKIE);
  const refreshTokenInCookie = _cookies.get(AUTH_ENCRYPTED_REFRESH_COOKIE);
  let result: {
    email: string;
    accountSetup: MicrosoftSession["accountSetup"];
  } | null = null;
  if (sessionInCookie) {
    const verifiedSession = await verifySession(sessionInCookie.value);
    if (verifiedSession) {
      result = {
        email: verifiedSession.email,
        accountSetup: verifiedSession.accountSetup,
      };
    }
  } else {
    if (refreshTokenInCookie) {
      const decryptedRefreshToken = await decryptValue(
        refreshTokenInCookie.value
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
      // console.log("verifiedSession", verifiedSession);
      // if (verifiedSession) {
      //   console.log("verifiedSession.email", verifiedSession.email);
      //   sessionEmail = verifiedSession.email;
      // }
      result = {
        email: currentSession.email,
        accountSetup: currentSession.accountSetup,
      };
    }
  }
  return result;
}

export async function readSessionWithRefresh(
  headers: Headers,
  request: Request
) {
  const authCookies = getAuthCookies(request);

  let currentSession = await verifySession(authCookies.session, {
    allowExpired: true,
  });
  if (currentSession && currentSession.expiresAt > Date.now()) {
    return currentSession;
  }

  // No refresh, cant do anything.
  if (!authCookies.refresh) {
    clearSessionCookie(headers, request);
    return null;
  }

  try {
    const refreshToken = await decryptValue(authCookies.refresh);
    const refreshed = await refreshMicrosoftAccessToken(refreshToken);
    if (!currentSession) {
      const profile = await fetchMicrosoftUser(refreshed.access_token);
      const accountSetup = await getAccountSetup(profile.email);
      currentSession = await buildSession(
        profile,
        refreshed.expires_in,
        accountSetup
      );
    } else {
      currentSession = await buildSession(
        {
          sub: currentSession.sub,
          email: currentSession.email,
          name: currentSession.name,
          picture: currentSession.picture,
        },
        refreshed.expires_in,
        currentSession.accountSetup
      );
    }
    // const session = await buildSession(currentSession, refreshed.expires_in);

    const email = currentSession.email;
    if (email === null) {
      throw new Error("No email found in session");
    }

    await setSessionCookie(headers, request, currentSession);
    await setRefreshTokenCookie(
      headers,
      request,
      refreshed.refresh_token ?? refreshToken
    );
    return currentSession;
  } catch (error) {
    console.error(error);
    clearSessionCookie(headers, request);
    // clearRefreshTokenCookie(headers, request);
    return null;
  }
}

export async function getAccountSetup(email: string) {
  return fetchQuery(api.tasks.getAccountSetup, {
    email: email,
  });
}
