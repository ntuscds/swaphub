import { env } from "@/lib/env";

export const MOCK_USER_EMAIL_COOKIE = "_MOCK_USER_EMAIL";
export const MOCK_USER_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function parseCookies(cookieHeader: string | null) {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  for (const entry of cookieHeader.split(";")) {
    const [name, ...value] = entry.trim().split("=");
    if (!name) continue;
    cookies[name] = decodeURIComponent(value.join("="));
  }
  return cookies;
}

function toBase64Url(bytes: Uint8Array) {
  const b64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(bytes).toString("base64")
      : btoa(String.fromCharCode(...bytes));
  return b64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(b64url: string) {
  const b64 = b64url.replaceAll("-", "+").replaceAll("_", "/");
  const padded = b64 + "===".slice((b64.length + 3) % 4);
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(padded, "base64"));
  }
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function sha256Bytes(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hash);
}

async function getAesGcmKey() {
  const keyBytes = await sha256Bytes(env.ENCRYPTION_KEY);
  return crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptMockUserEmail(email: string) {
  const key = await getAesGcmKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(email);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext)
  );
  return `${toBase64Url(iv)}.${toBase64Url(ciphertext)}`;
}

export async function decryptMockUserEmail(value: string) {
  try {
    const [ivB64, ctB64] = value.split(".");
    if (!ivB64 || !ctB64) return null;
    const key = await getAesGcmKey();
    const iv = fromBase64Url(ivB64);
    const ciphertext = fromBase64Url(ctB64);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    return null;
  }
}

export async function getMockUserEmailFromCookieHeader(cookieHeader: string | null) {
  const raw = parseCookies(cookieHeader)[MOCK_USER_EMAIL_COOKIE];
  if (!raw) return null;
  return await decryptMockUserEmail(raw);
}

export async function getMockUserEmailFromCookieStore(cookieStore: {
  get(name: string): { value: string } | undefined;
}) {
  const raw = cookieStore.get(MOCK_USER_EMAIL_COOKIE)?.value;
  if (!raw) return null;
  return await decryptMockUserEmail(raw);
}

export async function setMockUserEmailCookie(
  cookieStore: { set: (name: string, value: string, options: any) => void },
  email: string
) {
  const encrypted = await encryptMockUserEmail(email);
  cookieStore.set(MOCK_USER_EMAIL_COOKIE, encrypted, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MOCK_USER_COOKIE_MAX_AGE_SECONDS,
  });
}

