import { env } from "@/lib/env";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!env.E2E_MODE || !env.CONVEX_SITE_URL) return new NextResponse("Not found", { status: 404 });
  const form = await request.formData();
  const command = String(form.get("command") ?? "");
  const username = String(form.get("username") ?? "").replace(/^@/, "");
  const userId = Number(form.get("userId"));
  if (!command.startsWith("/link ") || !username || !Number.isSafeInteger(userId)) {
    return new NextResponse("Invalid Telegram identity", { status: 400 });
  }
  const response = await fetch(`${env.CONVEX_SITE_URL}/telegram/webhook`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Telegram-Bot-Api-Secret-Token": env.TELEGRAM_WEBHOOK_SECRET,
    },
    body: JSON.stringify({
      update_id: Date.now(),
      message: {
        message_id: Date.now(),
        chat: { id: userId },
        text: command,
        from: { id: userId, username, first_name: username },
      },
    }),
  });
  if (!response.ok) return new NextResponse(await response.text(), { status: response.status });
  return NextResponse.redirect(new URL("/e2e/telegram/linked", request.url), 303);
}
