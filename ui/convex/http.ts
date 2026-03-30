import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { z } from "zod";
import { Lock } from "@upstash/lock";
import { redis } from "@/db/upstash";

const http = httpRouter();

const TelegramUpdateSchema = z.object({
  update_id: z.number(),
  message: z
    .object({
      message_id: z.number(),
      chat: z.object({ id: z.number() }),
      text: z.string().optional(),
      from: z.object({
        id: z.number(),
        is_bot: z.boolean().optional(),
        first_name: z.string().optional(),
        username: z.string().optional(),
      }),
    })
    .optional(),
  callback_query: z
    .object({
      id: z.string(),
      from: z.object({
        id: z.number(),
        is_bot: z.boolean().optional(),
        first_name: z.string().optional(),
        username: z.string().optional(),
      }),
      message: z
        .object({
          message_id: z.number(),
          chat: z.object({ id: z.number() }),
        })
        .optional(),
      data: z.string().optional(),
    })
    .optional(),
});

const telegramWebhook = httpAction(async (ctx, request) => {
  const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = TelegramUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const isAuthorized = await ctx.runAction(
    internal.actions.verifyTelegramWebhookSecret,
    {
      providedSecret: secret ?? undefined,
    }
  );
  if (!isAuthorized) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const callback = parsed.data.callback_query;
  if (callback?.data && typeof callback.from?.id === "number") {
    const result = await ctx.runAction(
      internal.actions.processTelegramWebhookCallback,
      {
        callbackId: callback.id,
        payloadId: callback.data as any,
        fromId: callback.from.id,
        fromUsername: callback.from.username ?? "???",
        messageChatId: callback.message?.chat?.id,
        messageId: callback.message?.message_id,
      }
    );

    if ("error" in result && result.error) {
      return Response.json({ ok: false, error: result.error }, { status: 400 });
    }
    return Response.json({ ok: true });
  }

  const message = parsed.data.message;
  if (
    typeof message?.text === "string" &&
    typeof message.from?.id === "number"
  ) {
    await ctx.runAction(internal.actions.handleTelegramWebhookCommand, {
      text: message.text,
      fromId: message.from.id,
      fromUsername: message.from.username,
      chatId: message.chat.id,
    });
  }

  return Response.json({ ok: true });
});

http.route({
  path: "/telegram/webhook",
  method: "POST",
  handler: telegramWebhook,
});

export default http;
