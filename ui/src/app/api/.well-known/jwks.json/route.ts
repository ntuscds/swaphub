import { env } from "@/lib/env";
import { NextResponse } from "next/server";
import crypto from "node:crypto";

/**
 *
 * Cache this result in a cdn.
 */
export async function GET() {
  const publicKeyRaw = env.CONVEX_JWT_PUBLIC_KEY;
  const kid = env.CONVEX_JWT_KID;

  if (!publicKeyRaw) {
    return NextResponse.json(
      { error: "Missing CONVEX_JWT_PUBLIC_KEY" },
      { status: 500 }
    );
  }

  let jwk: Record<string, unknown>;
  try {
    if (publicKeyRaw.startsWith("{")) {
      jwk = JSON.parse(publicKeyRaw) as Record<string, unknown>;
    } else {
      const publicKey = crypto.createPublicKey(publicKeyRaw);
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
