"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { ConvexError } from "convex/values";
import { bot } from "@/telegram/telegram";
import { internal } from "./_generated/api";
import { env } from "@/lib/env-convex";
import crypto from "crypto";
import { redis } from "@/db/upstash";
import { Lock } from "@upstash/lock";
import { isValid, parse } from "@tma.js/init-data-node";

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
    targetSwapperId: v.id("swapper"),
    middlemanSwapperId: v.optional(v.id("swapper")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthorized");

    const result = await ctx.runMutation(internal.tasks.requestSwap, {
      targetSwapperId: args.targetSwapperId,
      middlemanSwapperId: args.middlemanSwapperId,
    });

    const { course, initiator, target, middleman } = result;
    const username = initiator.handle;

    const myIndexUrl = buildFStarsUrl(
      course.code,
      initiator.index,
      course.ay,
      course.semester
    );
    const otherIndexUrl = buildFStarsUrl(
      course.code,
      target.index,
      course.ay,
      course.semester
    );

    // 3 way swap.
    if (middleman) {
      await bot.sendMessage(
        Number(middleman.telegramUserId),
        `*${escapeMarkdown(course.code)} ${escapeMarkdown(course.name)} Swap Request*
@${escapeMarkdown(username)} wants to do a 3 way swap with you!
You only need to swap with them:
They have: [${escapeMarkdown(initiator.index)}](${myIndexUrl})
You have: [${escapeMarkdown(target.index)}](${otherIndexUrl}).`,
        {
          parse_mode: "Markdown",
          disable_web_page_preview: true,
          reply_markup: {
            inline_keyboard: [
              [
                { text: "Accept", callback_data: middleman.webhook.accept! },
                { text: "Decline", callback_data: middleman.webhook.decline! },
              ],
            ],
          },
        }
      );
      await bot.sendMessage(
        Number(target.telegramUserId),
        `*${escapeMarkdown(course.code)} ${escapeMarkdown(course.name)} Swap Request*
@${escapeMarkdown(username)} wants to do a 3 way swap with you!
After they swap with another party, you only need to swap with them:
They will have: [${escapeMarkdown(initiator.index)}](${myIndexUrl})
You have: [${escapeMarkdown(target.index)}](${otherIndexUrl}).`,
        {
          parse_mode: "Markdown",
          disable_web_page_preview: true,
          reply_markup: {
            inline_keyboard: [
              [
                { text: "Accept", callback_data: target.webhook.accept },
                { text: "Decline", callback_data: target.webhook.decline },
              ],
            ],
          },
        }
      );
      return;
    }

    // Direct swap.
    await bot
      .sendMessage(
        Number(target.telegramUserId),
        `*${escapeMarkdown(course.code)} ${escapeMarkdown(course.name)} Swap Request*
@${escapeMarkdown(username)} wants to swap with you!
They have: [${escapeMarkdown(initiator.index)}](${myIndexUrl})
You have: [${escapeMarkdown(target.index)}](${otherIndexUrl}).`,
        {
          parse_mode: "Markdown",
          disable_web_page_preview: true,
          reply_markup: {
            inline_keyboard: [
              [
                { text: "Accept", callback_data: target.webhook.accept },
                {
                  text: "Decline",
                  callback_data: target.webhook.decline,
                },
              ],
            ],
          },
        }
      )
      .catch((error) => {
        console.error(
          `Error sending message to ${target.telegramUserId}:`,
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

        const {
          action,
          isDirectSwap,
          isCompleted,
          course,
          iam,
          initiator,
          targetSwapper,
          middlemanSwapper,
        } = await ctx.runMutation(
          internal.tasks.handleSwapRequestWebhookCallback,
          {
            payloadId: args.payloadId,
            fromTelegramUserId: BigInt(args.fromId),
          }
        );

        const courseLabel = `${course.code} ${course.name}`;
        let msgForInitiator = "";
        let msgForMiddlemanSwapper = "";
        let msgForTargetSwapper = "";

        const setMessageForMe = (msg: string) => {
          if (iam === "middlemanSwapper") {
            msgForMiddlemanSwapper = msg;
          } else if (iam === "targetSwapper") {
            msgForTargetSwapper = msg;
          } else {
            throw new ConvexError("Invalid iam");
          }
        };

        if (action === "accept") {
          if (isDirectSwap) {
            if (iam === "middlemanSwapper") {
              throw new ConvexError(
                "Middleman swapper cannot accept direct swap request. How did this happen?"
              );
            }

            // Initiator declined the swap.
            if (!isCompleted) {
              setMessageForMe(`*Swap failed for ${escapeMarkdown(courseLabel)}*.
It seems that this request is no longer valid.`);
            } else {
              msgForTargetSwapper = `*Swap confirmation for ${escapeMarkdown(courseLabel)}*.
You have accepted @${escapeMarkdown(initiator.handle)}'s swap request, message them to proceed with the swap!.`;
              msgForInitiator = `*Swap confirmation for ${escapeMarkdown(courseLabel)}*.
@${escapeMarkdown(targetSwapper.handle)} has accepted your swap request, message them to proceed with the swap!.`;
            }
          }
          // 3 Way Swap
          else {
            if (!middlemanSwapper) {
              throw new ConvexError("Middleman swapper not found.");
            }

            // Initiator declined the swap.
            if (!initiator.acceptedByInitiator) {
              setMessageForMe(`*Swap failed for ${escapeMarkdown(courseLabel)}*.
It seems that this request is no longer valid.`);
            } else {
              const swapSequenceMessageInitiator = `First, YOU (${initiator.index}) <-> ${escapeMarkdown(middlemanSwapper.handle)} (${middlemanSwapper.index}) swap.
              Then, YOU (${middlemanSwapper.index}) <-> ${escapeMarkdown(targetSwapper.handle)} (${targetSwapper.index}) swap.`;
              const swapSequenceMessageTarget = `Wait for (${escapeMarkdown(initiator.handle)} (${initiator.index}) <-> ${escapeMarkdown(middlemanSwapper.handle)} (${middlemanSwapper.index}) swap.
              Then, YOU (${targetSwapper.index}) <-> ${escapeMarkdown(middlemanSwapper.handle)} (${middlemanSwapper.index})`;
              const swapSequenceMessageMiddleman = ` YOU (${middlemanSwapper.index}) <-> ${escapeMarkdown(initiator.handle)} (${initiator.index}) swap.`;

              if (iam === "middlemanSwapper") {
                if (!isCompleted) {
                  msgForMiddlemanSwapper = `*Swap pending confirmation for ${escapeMarkdown(courseLabel)}*.
You have accepted @${escapeMarkdown(initiator.handle)}'s request.

2 / 3 confirmations received.`;
                  msgForInitiator = `*Swap pending confirmation for ${escapeMarkdown(courseLabel)}*.
@${escapeMarkdown(middlemanSwapper.handle)} has accepted your request.

2 / 3 confirmations received.`;
                  msgForTargetSwapper = `*Swap pending confirmation for ${escapeMarkdown(courseLabel)}*.
@${escapeMarkdown(middlemanSwapper.handle)} has accepted a 3 way swap request you are participating in.

2 / 3 confirmations received.

You have yet to confirm this swap request.`;
                } else {
                  msgForMiddlemanSwapper = `*Swap confirmed for ${escapeMarkdown(courseLabel)}*.
You have accepted @${escapeMarkdown(initiator.handle)}'s request, finalising the 3 way swap between you, @${escapeMarkdown(targetSwapper.handle)} and @${escapeMarkdown(middlemanSwapper.handle)}.

${swapSequenceMessageMiddleman}

Message them to proceed with the swap!`;

                  msgForTargetSwapper = `*Swap confirmed for ${escapeMarkdown(courseLabel)}*.
@${escapeMarkdown(middlemanSwapper.handle)} has accepted a 3 way swap request you are participating in, finalising the swap between you, @${escapeMarkdown(initiator.handle)} and @${escapeMarkdown(middlemanSwapper.handle)}.

${swapSequenceMessageTarget}

Message them to proceed with the swap!`;

                  msgForInitiator = `*Swap confirmed for ${escapeMarkdown(courseLabel)}*.
@${escapeMarkdown(middlemanSwapper.handle)} has accepted your 3 way swap request, finalising the swap between you, @${escapeMarkdown(middlemanSwapper.handle)} and @${escapeMarkdown(targetSwapper.handle)}.

${swapSequenceMessageInitiator}

Message them to proceed with the swap!`;
                }
              } else if (iam === "targetSwapper") {
                if (!isCompleted) {
                  msgForTargetSwapper = `*Swap pending confirmation for ${escapeMarkdown(courseLabel)}*.
You have accepted @${escapeMarkdown(initiator.handle)}'s request.

2 / 3 confirmations received.`;
                  msgForInitiator = `*Swap pending confirmation for ${escapeMarkdown(courseLabel)}*.
@${escapeMarkdown(middlemanSwapper.handle)} has accepted your request.

2 / 3 confirmations received.`;
                  msgForMiddlemanSwapper = `*Swap pending confirmation for ${escapeMarkdown(courseLabel)}*.
@${escapeMarkdown(middlemanSwapper.handle)} has accepted a 3 way swap request you are participating in.

2 / 3 confirmations received.

You have yet to confirm this swap request.`;
                } else {
                  msgForTargetSwapper = `*Swap confirmed for ${escapeMarkdown(courseLabel)}*.
You have accepted @${escapeMarkdown(initiator.handle)}'s request, finalising the 3 way swap between you, @${escapeMarkdown(middlemanSwapper.handle)} and @${escapeMarkdown(targetSwapper.handle)}.

${swapSequenceMessageTarget}

Message them to proceed with the swap!`;

                  msgForInitiator = `*Swap confirmed for ${escapeMarkdown(courseLabel)}*.
@${escapeMarkdown(targetSwapper.handle)} has accepted your 3 way swap request, finalising the swap between you, @${escapeMarkdown(initiator.handle)} and @${escapeMarkdown(middlemanSwapper.handle)}.

${swapSequenceMessageInitiator}

Message them to proceed with the swap!`;

                  msgForMiddlemanSwapper = `*Swap confirmed for ${escapeMarkdown(courseLabel)}*.
@${escapeMarkdown(targetSwapper.handle)} has accepted a 3 way swap request you are participating in, finalising the swap between you, @${escapeMarkdown(initiator.handle)} and @${escapeMarkdown(targetSwapper.handle)}.

${swapSequenceMessageMiddleman}

Message them to proceed with the swap!`;
                }
              }
            }
          }
        } else {
          if (isDirectSwap) {
            msgForInitiator = `*Swap cancelled for ${escapeMarkdown(courseLabel)}*.
@${escapeMarkdown(targetSwapper.handle)} has declined to participate in your swap request.`;
            msgForTargetSwapper = `*Swap cancelled for ${escapeMarkdown(courseLabel)}*.
You declined to participate in @${escapeMarkdown(initiator.handle)}'s swap request.`;
          } else {
            if (!middlemanSwapper) {
              throw new ConvexError("Middleman swapper not found.");
            }

            if (iam === "targetSwapper") {
              msgForInitiator = `*Swap cancelled for ${escapeMarkdown(courseLabel)}*.
@${escapeMarkdown(middlemanSwapper.handle)} has declined to participate in your 3 way swap request.`;
              msgForTargetSwapper = `*Swap cancelled for ${escapeMarkdown(courseLabel)}*.
You declined to participate in @${escapeMarkdown(initiator.handle)}'s 3 way swap request.`;
              msgForMiddlemanSwapper = `*Swap cancelled for ${escapeMarkdown(courseLabel)}*.
@${escapeMarkdown(targetSwapper.handle)} has declined to participate in @${escapeMarkdown(initiator.handle)}'s 3 way swap request.`;
            } else if (iam === "middlemanSwapper") {
              msgForInitiator = `*Swap cancelled for ${escapeMarkdown(courseLabel)}*.
@${escapeMarkdown(targetSwapper.handle)} has declined to participate in @${escapeMarkdown(initiator.handle)}'s 3 way swap request.`;
              msgForMiddlemanSwapper = `*Swap cancelled for ${escapeMarkdown(courseLabel)}*.
You declined to participate in @${escapeMarkdown(initiator.handle)}'s 3 way swap request.`;
              msgForTargetSwapper = `*Swap cancelled for ${escapeMarkdown(courseLabel)}*.
@${escapeMarkdown(middlemanSwapper.handle)} has declined to participate in your 3 way swap request.`;
            }
          }
        }

        const sendMessage = async (userId: bigint | undefined, msg: string) => {
          if (msg === "") return;
          if (!userId) return;
          await bot
            .sendMessage(Number(userId), msg, {
              parse_mode: "Markdown",
            })
            .catch((error) => {
              console.error(`Error sending message to ${userId}:`, error);
            });
        };

        await Promise.all([
          sendMessage(initiator.telegramUserId, msgForInitiator),
          sendMessage(targetSwapper.telegramUserId, msgForTargetSwapper),
          sendMessage(middlemanSwapper?.telegramUserId, msgForMiddlemanSwapper),
        ]);

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

export const handleTelegramWebhookCommand = internalAction({
  args: {
    text: v.string(),
    fromId: v.number(),
    fromUsername: v.optional(v.string()),
    chatId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const raw = args.text.trim();
    if (!raw.startsWith("/")) {
      return { ok: true as const };
    }

    const [commandWithTarget, ...params] = raw.split(/\s+/);
    const command = commandWithTarget.split("@")[0]?.toLowerCase();
    if (command !== "/link") {
      return { ok: true as const };
    }

    const chatId = args.chatId ?? args.fromId;
    if (params.length < 2) {
      await bot
        .sendMessage(
          chatId,
          "Usage: /link <email> <code>\nExample: /link user@e.ntu.edu.sg abc123"
        )
        .catch((error) => {
          console.error(`Error sending /link usage to ${chatId}:`, error);
        });
      return { ok: true as const };
    }

    const email = params[0] ?? "";
    const code = params[1] ?? "";
    const username = args.fromUsername ?? `user_${args.fromId}`;

    try {
      const result = await ctx.runMutation(
        internal.tasks.verifyTelegramAccount,
        {
          email,
          code,
          telegramUserId: BigInt(args.fromId),
          username,
        }
      );

      if (!result.success) {
        await bot
          .sendMessage(
            chatId,
            "Link failed. Please double-check your email/code and try again."
          )
          .catch((error) => {
            console.error(
              `Error sending /link failure message to ${chatId}:`,
              error
            );
          });
        return { ok: true as const };
      }

      await bot
        .sendMessage(
          chatId,
          "Telegram account linked successfully! Please go back to the web app to continue."
        )
        .catch((error) => {
          console.error(
            `Error sending /link success message to ${chatId}:`,
            error
          );
        });
      return { ok: true as const };
    } catch (error) {
      console.error(`Error handling /link command from ${args.fromId}:`, error);
      await bot
        .sendMessage(chatId, "Something went wrong while linking your account.")
        .catch(() => {});
      return { ok: true as const };
    }
  },
});

export const requestLinkTelegramAccount = action({
  args: {
    telegramRawInitData: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; email: string; code: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }
    const email = identity.email ?? identity.subject;
    if (!email) {
      throw new ConvexError("Email not found");
    }

    if (args.telegramRawInitData) {
      if (!isValid(args.telegramRawInitData, env.BOT_KEY)) {
        throw new ConvexError("Invalid Telegram init data");
      }
      const initData = parse(args.telegramRawInitData);
      if (!initData.user) {
        throw new ConvexError("Invalid Telegram init data");
      }
      const telegramUserId = BigInt(initData.user.id);

      const username = initData.user.username;
      if (!username) {
        throw new ConvexError("Invalid Telegram username");
      }

      // If valid, then do the link process
      const result = await ctx.runMutation(
        internal.tasks.verifyTelegramAccount,
        {
          email,
          code: "",
          telegramUserId,
          username,
          bypassCodeCheck: true,
        }
      );
      if (!result.success) {
        throw new ConvexError("Failed to link Telegram account");
      }

      return {
        success: true,
        email,
        code: "",
      };
    }

    return await ctx.runMutation(internal.tasks.requestLinkTelegramAccount, {});
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
