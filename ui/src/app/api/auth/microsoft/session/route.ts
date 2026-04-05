import { NextResponse } from "next/server";
import { readSessionWithRefresh } from "@/lib/microsoft-auth";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const _cookies = await cookies();
  const session = await readSessionWithRefresh(_cookies);

  return NextResponse.json({
    authenticated: session !== null,
    user: session,
  });
}
