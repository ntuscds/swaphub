import { NextResponse } from "next/server";
import { readSessionWithRefresh } from "@/lib/microsoft-auth";

export async function GET(request: Request) {
  const headers = new Headers();
  const session = await readSessionWithRefresh(headers, request);

  return NextResponse.json(
    {
      authenticated: session !== null,
      user: session,
    },
    { headers }
  );
}
