import { refreshSession } from "@/lib/microsoft-auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const redirectUrl = requestUrl.searchParams.get("redirect");
  const _cookies = await cookies();
  const session = await refreshSession(_cookies);
  if (session) {
    const response = NextResponse.redirect(
      new URL(redirectUrl ?? "/", request.url)
    );
    return response;
  }
  const response = NextResponse.redirect(new URL("/onboard", request.url));
  return response;
}
