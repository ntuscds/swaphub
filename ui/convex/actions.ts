"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { ConvexError } from "convex/values";
import { bot } from "@/telegram/telegram";
import { internal } from "./_generated/api";
import { env } from "@/lib/env";
import crypto from "crypto";
import { redis } from "@/db/upstash";
import { Lock } from "@upstash/lock";

function escapeMarkdown(text: string): string {
  return text.replace(/([_*`[\]()~])/g, "\\$1");
}

function buildFStarsUrl(
  courseCode: string,
  index: string,
  ay: string,
  semester: string
) {
  return `https://fstars.benapps.dev/preview?ay=${encodeURIComponent(
    ay
  )}&s=${encodeURIComponent(semester)}&c=${encodeURIComponent(
    courseCode
  )}:${encodeURIComponent(index)}`;
}

export const sendSwapRequest = action({
  args: {
    courseId: v.id("courses"),
    otherSwapperId: v.id("swapper"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthorized");

    const result = await ctx.runMutation(internal.tasks.requestSwap, {
      courseId: args.courseId,
      otherSwapperId: args.otherSwapperId,
    });

    const { course, me, other, webhook } = result;
    const username = me.handle;

    const myIndexUrl = buildFStarsUrl(
      course.code,
      me.index,
      course.ay,
      course.semester
    );
    const otherIndexUrl = buildFStarsUrl(
      course.code,
      other.index,
      course.ay,
      course.semester
    );

    await bot
      .sendMessage(
        Number(other.telegramUserId),
        `*${escapeMarkdown(course.code)} ${escapeMarkdown(course.name)} Swap Request*
@${escapeMarkdown(username)} wants to swap with you!
They have: [${escapeMarkdown(me.index)}](${myIndexUrl})
You have: [${escapeMarkdown(other.index)}](${otherIndexUrl}).`,
        {
          parse_mode: "Markdown",
          disable_web_page_preview: true,
          reply_markup: {
            inline_keyboard: [
              [
                { text: "Accept", callback_data: webhook.accept },
                {
                  text: "Already Swapped",
                  callback_data: webhook.already_swapped,
                },
              ],
            ],
          },
        }
      )
      .catch((error) => {
        console.error(
          `Error sending message to ${other.telegramUserId}:`,
          error
        );
      });
  },
});

/** Constant-time comparison to avoid timing attacks. */
function secureCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export const verifyTelegramWebhookSecret = internalAction({
  args: {
    providedSecret: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    if (!args.providedSecret) return false;
    return secureCompare(args.providedSecret, env.TELEGRAM_WEBHOOK_SECRET);
  },
});

export const processTelegramWebhookCallback = internalAction({
  args: {
    callbackId: v.string(),
    payloadId: v.id("telegram_callback_data"),
    fromId: v.number(),
    fromUsername: v.string(),
    messageChatId: v.optional(v.number()),
    messageId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const lock = new Lock({
      id: `findex:tg_wh:${args.payloadId}`,
      lease: 5000,
      redis,
    });

    if (await lock.acquire()) {
      try {
        const lockKey = `telegram:webhook:${args.payloadId}`;
        const lockValue = await redis.get(lockKey);
        if (lockValue) {
          return { ok: true as const };
        }

        const mutationResult = await ctx.runMutation(
          internal.tasks.handleSwapRequestWebhookCallback,
          {
            payloadId: args.payloadId,
            fromTelegramUserId: BigInt(args.fromId),
          }
        );

        const courseLabel = `${mutationResult.courseCode} ${mutationResult.courseName}`;
        if (mutationResult.action === "accept") {
          await bot
            .sendMessage(
              mutationResult.otherTelegramUserId,
              `*Swap confirmed for ${escapeMarkdown(courseLabel)}*.\n@${escapeMarkdown(
                args.fromUsername
              )} has accepted your swap request, they may get in touch with you, please make sure your DMs are open.\n \nThis request is now marked as "Swapped". If this falls through, you may re-enable this request *My Swaps > ${escapeMarkdown(courseLabel)} > Uncheck "Have Swapped"*.`,
              { parse_mode: "Markdown" }
            )
            .catch((error) => {
              console.error(
                `Error sending message to ${mutationResult.otherTelegramUserId}:`,
                error
              );
            });
          await bot
            .sendMessage(
              mutationResult.thisTelegramUserId,
              `*Successfully sent swap request*\nPlease message @${escapeMarkdown(
                mutationResult.otherUsername
              )} to proceed with the swap. We have reminded them to open their DMs.\n \nThis request is now marked as "Swapped". If this falls through, you may re-enable this request *My Swaps > ${escapeMarkdown(courseLabel)} > Uncheck "Have Swapped"*.`,
              { parse_mode: "Markdown" }
            )
            .catch((error) => {
              console.error(
                `Error sending message to ${mutationResult.otherTelegramUserId}:`,
                error
              );
            });
        } else {
          await bot
            .sendMessage(
              mutationResult.thisTelegramUserId,
              `*Marked ${escapeMarkdown(courseLabel)} as already swapped*.\nIf you still want to swap for this course, you may re-enable this request *My Swaps > ${escapeMarkdown(courseLabel)} > Uncheck "Have Swapped"*.`,
              { parse_mode: "Markdown" }
            )
            .catch((error) => {
              console.error(
                `Error sending message to ${mutationResult.thisTelegramUserId}:`,
                error
              );
            });
        }

        await bot.answerCallbackQuery(args.callbackId).catch(() => {});
        if (args.messageChatId != null && args.messageId != null) {
          await bot
            .editMessageReplyMarkup(
              { inline_keyboard: [] },
              { chat_id: args.messageChatId, message_id: args.messageId }
            )
            .catch(() => {});
        }
        await redis.set(lockKey, "1", { ex: 60 * 5 });

        return { ok: true as const };
      } catch (error) {
        console.error(`Error handling callback ${args.callbackId}:`, error);
      } finally {
        await lock.release();
      }
    }

    return { ok: true as const };
  },
});

// export const sendSwapCallbackTelegram = internalAction({
//   args: {
//     courseId: v.id("courses"),
//     otherSwapperId: v.id("swapper"),
//     action: v.union(v.literal("accept"), v.literal("already_swapped")),
//   },
//   handler: async (ctx, args) => {
//     const identity = await ctx.auth.getUserIdentity();
//     if (!identity) throw new ConvexError("Unauthorized");

//     const me = BigInt(identity.subject);

//     const otherSwapper = await ctx.db.get(args.otherSwapperId);
//     if (!otherSwapper || otherSwapper.courseId !== args.courseId) {
//       throw new ConvexError("Swap request not found.");
//     }

//     const mySwappers = await ctx.db
//       .query("swapper")
//       .withIndex("by_telegramUserId", (q) => q.eq("telegramUserId", me))
//       .collect();
//     const mySwapper = mySwappers.find((s) => s.courseId === args.courseId);
//     if (!mySwapper) throw new ConvexError("Swapper not found.");

//     const course = await ctx.db.get(args.courseId);
//     if (!course) throw new ConvexError("Course not found.");

//     const meUser = await ctx.db
//       .query("users")
//       .withIndex("by_userId", (q) => q.eq("userId", me))
//       .unique();

//     const username = meUser?.handle ?? "???";
//     const courseLabel = `${course.code} ${course.name}`;

//     if (args.action === "accept") {
//       await bot.sendMessage(
//         Number(otherSwapper.telegramUserId),
//         `*Swap confirmed for ${escapeMarkdown(
//           courseLabel
//         )}*\\n@${escapeMarkdown(username)} has accepted your swap request, they may get in touch with you, please make sure your DMs are open.`,
//         { parse_mode: "Markdown" }
//       );
//       await bot.sendMessage(
//         Number(mySwapper.telegramUserId),
//         `*Successfully sent swap request*\\nPlease message @${escapeMarkdown(
//           username
//         )} to proceed with the swap.`,
//         { parse_mode: "Markdown" }
//       );
//     } else {
//       await bot.sendMessage(
//         Number(mySwapper.telegramUserId),
//         `*Marked ${escapeMarkdown(courseLabel)} as already swapped*.`,
//         { parse_mode: "Markdown" }
//       );
//     }
//   },
// });
