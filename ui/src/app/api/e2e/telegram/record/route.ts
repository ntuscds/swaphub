import { api } from "../../../../../../convex/_generated/api";
import { convexServerOptions } from "@/lib/convex-server";
import { env } from "@/lib/env";
import { fetchMutation } from "convex/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";

const MessageSchema = z.object({
  telegramUserId: z.string(),
  text: z.string(),
  options: z.unknown().optional(),
});

export async function POST(request: Request) {
  if (!env.E2E_MODE || request.headers.get("x-e2e-api-key") !== env.API_KEY) {
    return new NextResponse("Not found", { status: 404 });
  }
  const parsed = MessageSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json(parsed.error.flatten(), { status: 400 });
  await fetchMutation(
    api.e2e.recordTelegramMessage,
    { apiKey: env.API_KEY, ...parsed.data },
    convexServerOptions()
  );
  return NextResponse.json({ ok: true });
}
