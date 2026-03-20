import { env } from "@/lib/env";
import TelegramBot from "node-telegram-bot-api";

export const bot = new TelegramBot(env.BOT_KEY, { polling: false });
