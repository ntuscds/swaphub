import { decryptValue, encryptValue } from "@/lib/encrypt";

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

export async function encryptMockUserEmail(
  email: string,
  encryptionKey: string
) {
  return encryptValue(email, encryptionKey);
}

export async function decryptMockUserEmail(
  value: string,
  encryptionKey: string
) {
  try {
    return await decryptValue(value, encryptionKey);
  } catch {
    return null;
  }
}

export async function getMockUserEmailFromCookieHeader(
  cookieHeader: string | null,
  encryptionKey: string
) {
  const raw = parseCookies(cookieHeader)[MOCK_USER_EMAIL_COOKIE];
  if (!raw) return null;
  return await decryptMockUserEmail(raw, encryptionKey);
}

export async function getMockUserEmailFromCookieStore(
  cookieStore: {
    get(name: string): { value: string } | undefined;
  },
  encryptionKey: string
) {
  const raw = cookieStore.get(MOCK_USER_EMAIL_COOKIE)?.value;
  if (!raw) return null;
  return await decryptMockUserEmail(raw, encryptionKey);
}

export async function setMockUserEmailCookie(
  cookieStore: { set: (name: string, value: string, options: any) => void },
  email: string,
  encryptionKey: string
) {
  const encrypted = await encryptMockUserEmail(email, encryptionKey);
  cookieStore.set(MOCK_USER_EMAIL_COOKIE, encrypted, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MOCK_USER_COOKIE_MAX_AGE_SECONDS,
  });
}
