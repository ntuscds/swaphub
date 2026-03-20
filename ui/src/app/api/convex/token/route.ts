import { NextResponse } from "next/server";
import { isValid, parse } from "@tma.js/init-data-node";
import crypto from "node:crypto";

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
  const initData = request.headers.get("Authorization") ?? "";
  if (!initData) {
    return NextResponse.json(
      { error: "Missing Authorization" },
      { status: 401 }
    );
  }

  const botKey = process.env.BOT_KEY;
  if (!botKey) {
    return NextResponse.json(
      { error: "Missing BOT_KEY on server" },
      { status: 500 }
    );
  }

  if (!isValid(initData, botKey)) {
    return NextResponse.json({ error: "Invalid initData" }, { status: 401 });
  }

  const parsed = parse(initData);
  const user = parsed.user;
  if (!user) {
    return NextResponse.json(
      { error: "Missing user in initData" },
      { status: 401 }
    );
  }

  const issuer = process.env.CONVEX_JWT_ISSUER;
  const audience = process.env.CONVEX_JWT_AUDIENCE;
  const kid = process.env.CONVEX_JWT_KID ?? "telegram-miniapp";
  const privateKeyPem = process.env.CONVEX_JWT_PRIVATE_KEY!.replaceAll(
    "\\\\n",
    "\n"
  );
  if (!issuer || !audience || !privateKeyPem) {
    return NextResponse.json(
      {
        error:
          "Missing CONVEX_JWT_ISSUER / CONVEX_JWT_AUDIENCE / CONVEX_JWT_PRIVATE_KEY",
      },
      { status: 500 }
    );
  }

  const token = signJwtRS256({
    issuer,
    audience,
    subject: String(user.id),
    kid,
    privateKeyPem,
    expiresInSeconds: 60 * 60,
    name:
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.username,
    nickname: user.username,
  });

  return NextResponse.json({ token });
}
