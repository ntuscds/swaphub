import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { env } from "@/lib/env-convex";

function assertE2E(apiKey: string) {
  if (env.BOT_KEY !== "e2e-telegram-token" || apiKey !== env.API_KEY) {
    throw new ConvexError("E2E adapter is disabled");
  }
}

export const recordTelegramMessage = mutation({
  args: {
    apiKey: v.string(),
    telegramUserId: v.string(),
    text: v.string(),
    options: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    assertE2E(args.apiKey);
    const { apiKey: _apiKey, ...message } = args;
    return ctx.db.insert("e2e_telegram_outbox", message);
  },
});

export const listTelegramOutbox = query({
  args: { apiKey: v.string(), telegramUserId: v.string() },
  handler: async (ctx, args) => {
    assertE2E(args.apiKey);
    return ctx.db
      .query("e2e_telegram_outbox")
      .withIndex("by_telegramUserId", (q) =>
        q.eq("telegramUserId", args.telegramUserId)
      )
      .order("asc")
      .collect();
  },
});

export const clearTelegramOutbox = mutation({
  args: { apiKey: v.string(), telegramUserId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    assertE2E(args.apiKey);
    const messages = args.telegramUserId
      ? await ctx.db
          .query("e2e_telegram_outbox")
          .withIndex("by_telegramUserId", (q) =>
            q.eq("telegramUserId", args.telegramUserId!)
          )
          .collect()
      : await ctx.db.query("e2e_telegram_outbox").collect();
    await Promise.all(messages.map((message) => ctx.db.delete(message._id)));
    return { deleted: messages.length };
  },
});

export const resetAndSeed = mutation({
  args: { apiKey: v.string() },
  handler: async (ctx, args) => {
    assertE2E(args.apiKey);
    const tableNames = [
      "swap_requests",
      "swapper_wants",
      "swapper",
      "telegram_user_verification",
      "telegram_callback_data",
      "e2e_telegram_outbox",
      "users",
      "course_index",
      "courses",
      "programs",
    ] as const;
    for (const tableName of tableNames) {
      const documents = await ctx.db.query(tableName).collect();
      for (const document of documents) await ctx.db.delete(document._id);
    }

    const courseCodes = [
      "CC0001",
      "CC0002",
      "CC0003",
      "CC0005",
      "CC0007",
      "CC0008",
      "CC0015",
      "ML0004",
      "SC2005",
      "SC2008",
      "AB1201",
      "PH1104",
      "MA2011",
    ];
    for (const code of courseCodes) {
      const courseId = await ctx.db.insert("courses", {
        code,
        name: `${code} E2E Course`,
        au: 3,
        ay: "26/27",
        semester: "1",
        searchText: `${code} ${code} E2E Course`.toLowerCase(),
        isAvailableUE: true,
        isAvailableBD: true,
        isAvailableGEPE: true,
        isSelfPaced: false,
      });
      for (let index = 1; index <= 10; index += 1) {
        await ctx.db.insert("course_index", {
          courseId,
          index: String(index),
        });
      }
    }
    return { courses: courseCodes.length, indexes: courseCodes.length * 10 };
  },
});
