import { NextResponse } from "next/server";
import { sign as jwtSign } from "jsonwebtoken";
import { env } from "@/lib/env";
import { readSessionWithRefresh } from "@/lib/microsoft-auth";

const MOCK_USER_EMAIL_COOKIE = "_MOCK_USER_EMAIL";

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

export async function GET(request: Request) {
  const headers = new Headers();
  const session = await readSessionWithRefresh(headers, request);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers }
    );
  }

  const issuer = env.CONVEX_JWT_ISSUER;
  const audience = env.CONVEX_JWT_AUDIENCE;
  const kid = env.CONVEX_JWT_KID;
  const privateKeyPem = env.CONVEX_JWT_PRIVATE_KEY;
  const mockEmail = parseCookies(request.headers.get("cookie"))[
    MOCK_USER_EMAIL_COOKIE
  ];
  const tokenSubject = mockEmail || session.email;
  if (!tokenSubject) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers }
    );
  }

  const token = jwtSign({}, privateKeyPem, {
    algorithm: "RS256",
    keyid: kid,
    issuer,
    audience,
    subject: tokenSubject,
    expiresIn: 60,
  });

  return NextResponse.json({ token }, { headers });
}
