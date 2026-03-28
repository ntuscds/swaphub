import { NextResponse } from "next/server";
import { isValid, parse } from "@tma.js/init-data-node";
import crypto from "node:crypto";
import { env } from "@/lib/env";
import { readSessionWithRefresh } from "@/lib/microsoft-auth";

function base64Url(input: Buffer | string) {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function jsonBase64Url(obj: unknown) {
  return base64Url(Buffer.from(JSON.stringify(obj)));
}

function signJwtRS256({
  issuer,
  audience,
  subject,
  kid,
  privateKeyPem,
  expiresInSeconds,
  name,
  nickname,
}: {
  issuer: string;
  audience: string;
  subject: string;
  kid: string;
  privateKeyPem: string;
  expiresInSeconds: number;
  name?: string;
  nickname?: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT", kid };
  const payload: Record<string, unknown> = {
    iss: issuer,
    aud: audience,
    sub: subject,
    iat: now,
    exp: now + expiresInSeconds,
  };

  // These map nicely to Convex's `UserIdentity` fields.
  if (name) payload.name = name;
  if (nickname) payload.nickname = nickname;

  const signingInput = `${jsonBase64Url(header)}.${jsonBase64Url(payload)}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(signingInput), {
    key: privateKeyPem,
  });
  return `${signingInput}.${base64Url(signature)}`;
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
  if (!session.email) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers }
    );
  }

  const token = signJwtRS256({
    issuer,
    audience,
    subject: session.email,
    kid,
    privateKeyPem,
    expiresInSeconds: 60,
  });

  return NextResponse.json({ token }, { headers });
}
