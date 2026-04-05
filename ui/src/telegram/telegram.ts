"use node";

import { env } from "@/lib/env-convex";
import TelegramBot from "node-telegram-bot-api";

export const bot = new TelegramBot(env.BOT_KEY, { polling: false });
