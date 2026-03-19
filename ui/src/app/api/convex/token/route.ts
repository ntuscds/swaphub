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
    console.error("Missing BOT_KEY on server");
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
  // const privateKeyPem = process.env.CONVEX_JWT_PRIVATE_KEY;
  const privateKeyPem = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDGRXlnwBShN5w7
JVtxwu1NKxKr404CskI6tSfNA3v4+z1j2P4fgqcBjgc0bKY2JYcTM05bA+8X9Pqu
N53LaJYPNJ2CvbUMIju4Xz59OM8sBytu0VuIP5sHSe0ErKJ3axwooTtlWkTn9vD9
CsTqtet+R0qEMDZKcHO1JJwwSgS9oYfUsPxK6w7FLksC0mh2TgEDzyzdTCtqrSTH
kIhnqRDpbyVenCIkweTOlMjvP1EJcFDlb+EHdw6mv4E+ppwLFnMDEWB8lhOKJOzf
YsogG00A/j6IqDveUKps8sbdz+SMkXI9hZFyp8TtAjSVyuLDwf8/yvm+5CgqzAzg
bCrWngiDAgMBAAECggEABJRxP/oaCo6iyg5MWkiIO7qYJVFMVC1IRgaOOKLxIlNc
sSmU1nx+8r8USoaMoP6P7AZziRBXswQieui8+TMIGFTSTe/84R60phxzxee3MrX9
r63Kq/na0Q8eQvfhOYScs2bksiwkyv4+GyeRseGUOCgEasuZosbjMqwkUXc8PHcW
0LE/MIRRi6KSbbL5bFd3fyoZuPtCx1oOksMBt1Yy1N0oPl4NbkHGQkw64ADQrvZJ
AocXx/VdWY1G30QnimSnWfEX+JbA38xwsl4uSYyp8MQlj6l+h3Zek9sSH6+n8d7l
KAy8UHyPsWBPd5YvJFo4cG3ux7Jnrj+m6vmuddSCzQKBgQDqZ8O/p3ZCgq1br0cT
ZPBvtNndJrU4nt2ril3cj7pO3ralLxPKWO4iiqbTzCPWgW5K+r8IPsaBrVYh1MSg
iJyKamBqftuKQwyS5O6APVi4FeB2xfzIlMaCpy09EX25sHDn0ztgLvhvWr/Rx5/q
/gsb+uDwYdOC2XFpd8AiAkFgpQKBgQDYiYYEVm00qcB6707wu99M03cl/H10LBaf
vdjEMXYLHSCKL+CJzLHEACXKQdpI0sIwnqjnJjzUS5OFe8245s70z/hsZEERM+7O
65C6joZaZBkEpKTSpJCL5vnhYV6owW9ssJmq5j79FR6XBT41GHzHQbHUU5eHh2l9
2HaUUBGUBwKBgHNHuu57xl5pdCa+Kh9wqgrWD7uCuOdywiQGNakuinsVbxAH+hyu
5dbZB7jsEcgB+aModGDytp+6Br02rckhxpMQRAC8CO6TkRCBRIaPJR3LrIvdTTe8
a3CAFXCONJ3pF2375ZylHQtuvx3FpnFkpUQKeyvdgK8+j1dGTJitMUf9AoGAAsMe
VofTtMxFjEvpMeDzpEM+Tdm+r/CwCTGexkHrQ5EHjTu3HYri6aEm2kGkyzEFESG0
/d3bAMpGA3nk0er/0NemT5unyNRkw3b1zatrw1NrjkebYqR+w4oavelED9sH1Ncb
3rY5L3lJfpuug3bggJox7odyc2Qi0FwmhxXOY5kCgYEAourMPhFvO1IAAah29j31
8IIEJUYgYLJdPJaFb7VGvu8A2zfZDL7OCNzpiPxlMBTMs0Ax6a91fp0DSsJhakdL
k39J7EplL5YhfKltjGRBVEly1e1CovDbs7l2H3E9JaStU6+atRrW4Hhy0hpbbDAN
gyCr9YWOf+xVdc18ULLckRY=
-----END PRIVATE KEY-----`;
  if (!issuer || !audience || !privateKeyPem) {
    console.error(
      "Missing CONVEX_JWT_ISSUER / CONVEX_JWT_AUDIENCE / CONVEX_JWT_PRIVATE_KEY"
    );
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
