import { NextResponse } from "next/server";
import { sign as jwtSign } from "jsonwebtoken";
import { env } from "@/lib/env";
import { readSessionWithRefresh } from "@/lib/microsoft-auth";
import { cookies } from "next/headers";
import { getMockUserEmailFromCookieHeader } from "@/lib/mock-user";

export async function GET(request: Request) {
  const _cookies = await cookies();
  const session = await readSessionWithRefresh(_cookies);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const issuer = env.CONVEX_JWT_ISSUER;
  const audience = env.CONVEX_JWT_AUDIENCE;
  const kid = env.CONVEX_JWT_KID;
  const privateKeyPem = env.CONVEX_JWT_PRIVATE_KEY;

  let tokenSubject = session.email;
  if (env.NEXT_PUBLIC_ALLOW_MOCK_USER) {
    const mockEmail = await getMockUserEmailFromCookieHeader(
      request.headers.get("cookie")
    );
    tokenSubject = mockEmail ?? session.email;
  }
  if (!tokenSubject) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = jwtSign({}, privateKeyPem, {
    algorithm: "RS256",
    keyid: kid,
    issuer,
    audience,
    subject: tokenSubject,
    expiresIn: 60 * 5,
  });

  return NextResponse.json({
    token,
  });
}
