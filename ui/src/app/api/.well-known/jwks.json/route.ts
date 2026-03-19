import { NextResponse } from "next/server";
import crypto from "node:crypto";

export async function GET() {
  // const publicKeyRaw = process.env.CONVEX_JWT_PUBLIC_KEY;
  const publicKeyRaw = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxkV5Z8AUoTecOyVbccLt
TSsSq+NOArJCOrUnzQN7+Ps9Y9j+H4KnAY4HNGymNiWHEzNOWwPvF/T6rjedy2iW
DzSdgr21DCI7uF8+fTjPLAcrbtFbiD+bB0ntBKyid2scKKE7ZVpE5/bw/QrE6rXr
fkdKhDA2SnBztSScMEoEvaGH1LD8SusOxS5LAtJodk4BA88s3Uwraq0kx5CIZ6kQ
6W8lXpwiJMHkzpTI7z9RCXBQ5W/hB3cOpr+BPqacCxZzAxFgfJYTiiTs32LKIBtN
AP4+iKg73lCqbPLG3c/kjJFyPYWRcqfE7QI0lcriw8H/P8r5vuQoKswM4Gwq1p4I
gwIDAQAB
-----END PUBLIC KEY-----`;
  const kid = process.env.CONVEX_JWT_KID ?? "telegram-miniapp";

  if (!publicKeyRaw) {
    return NextResponse.json(
      { error: "Missing CONVEX_JWT_PUBLIC_KEY" },
      { status: 500 }
    );
  }

  // Support both:
  // 1) PEM in env with escaped newlines (-----BEGIN...\\n...),
  // 2) direct JWK JSON string in env.
  const normalized = publicKeyRaw; // publicKeyRaw.trim().replace(/\\n/g, "\n");

  let jwk: Record<string, unknown>;
  try {
    if (normalized.startsWith("{")) {
      jwk = JSON.parse(normalized) as Record<string, unknown>;
    } else {
      const publicKey = crypto.createPublicKey(normalized);
      jwk = publicKey.export({ format: "jwk" }) as Record<string, unknown>;
    }
  } catch (error) {
    return NextResponse.json(
      {
        error:
          "Invalid CONVEX_JWT_PUBLIC_KEY format. Provide PEM (with \\n line breaks) or JWK JSON.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    keys: [
      {
        ...jwk,
        kid,
        use: "sig",
        alg: "RS256",
      },
    ],
  });
}
