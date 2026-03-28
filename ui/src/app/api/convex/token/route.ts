import { NextResponse } from "next/server";
import { sign as jwtSign } from "jsonwebtoken";
import { env } from "@/lib/env";
import { readSessionWithRefresh } from "@/lib/microsoft-auth";

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
  if (!session.email) {
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
    subject: session.email,
    expiresIn: 60,
  });

  return NextResponse.json({ token }, { headers });
}
