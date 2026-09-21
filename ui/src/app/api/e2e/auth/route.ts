import { env } from "@/lib/env";
import {
  buildSession,
  getAccountSetup,
  getBaseUrl,
  getSafeCallbackUrl,
  setRefreshTokenCookie,
  setSessionCookie,
} from "@/lib/microsoft-auth";
import { ALLOWED_DOMAINS } from "@/lib/user";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!env.E2E_MODE) return new NextResponse("Not found", { status: 404 });
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const callbackUrl = getSafeCallbackUrl(String(form.get("callbackUrl") ?? ""));
  const allowed = ALLOWED_DOMAINS.some((domain) => email.endsWith(domain));
  if (!allowed) {
    return NextResponse.redirect(new URL("/onboard?error=email_not_allowed", getBaseUrl(request)), 303);
  }
  const accountSetup = await getAccountSetup(email);
  const username = email.split("@")[0] ?? email;
  const session = await buildSession(
    { sub: `e2e:${email}`, email, name: username, picture: null },
    10 * 60,
    accountSetup
  );
  const cookieStore = await cookies();
  await setSessionCookie(cookieStore, session);
  await setRefreshTokenCookie(cookieStore, `e2e-refresh:${email}`);
  return NextResponse.redirect(new URL(callbackUrl, getBaseUrl(request)), 303);
}
