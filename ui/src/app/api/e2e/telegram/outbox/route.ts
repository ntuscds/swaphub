import { api } from "../../../../../../convex/_generated/api";
import { env } from "@/lib/env";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { NextResponse } from "next/server";

const convexOptions = () => ({
  url: env.CONVEX_SERVER_URL ?? env.NEXT_PUBLIC_CONVEX_URL,
  skipConvexDeploymentUrlCheck: true,
});

export async function GET(request: Request) {
  if (!env.E2E_MODE) return new NextResponse("Not found", { status: 404 });
  const telegramUserId = new URL(request.url).searchParams.get("telegramUserId");
  if (!telegramUserId) return new NextResponse("telegramUserId is required", { status: 400 });
  const messages = await fetchQuery(
    api.e2e.listTelegramOutbox,
    { apiKey: env.API_KEY, telegramUserId },
    convexOptions()
  );
  return NextResponse.json({ messages });
}

export async function DELETE(request: Request) {
  if (!env.E2E_MODE) return new NextResponse("Not found", { status: 404 });
  const telegramUserId = new URL(request.url).searchParams.get("telegramUserId") ?? undefined;
  const result = await fetchMutation(
    api.e2e.clearTelegramOutbox,
    { apiKey: env.API_KEY, telegramUserId },
    convexOptions()
  );
  return NextResponse.json(result);
}
