"use node";

import { env } from "@/lib/env-convex";
import TelegramBot, { type Message } from "node-telegram-bot-api";

const e2eBot: Pick<TelegramBot, "sendMessage"> = {
  async sendMessage(telegramUserId, text, options) {
    const response = await fetch(env.UPSTASH_REDIS_REST_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-e2e-api-key": env.API_KEY,
      },
      body: JSON.stringify({
        telegramUserId: String(telegramUserId),
        text,
        options,
      }),
    });
    if (!response.ok) throw new Error(`Failed to record Telegram message: ${response.status}`);
    return {} as Message;
  },
};

export const bot: Pick<TelegramBot, "sendMessage"> = env.BOT_KEY === "e2e-telegram-token"
  ? e2eBot
  : new TelegramBot(env.BOT_KEY, { polling: false });
