"use node";

import { v } from "convex/values";
import { action, internalAction, type ActionCtx } from "./_generated/server";
import { ConvexError } from "convex/values";
import { bot } from "@/telegram/telegram";
import { internal } from "./_generated/api";
import { env } from "@/lib/env-convex";
import crypto from "crypto";
import { redis } from "@/db/upstash";
import { Lock } from "@upstash/lock";
import { isValid, parse } from "@tma.js/init-data-node";
import {
  MESSAGE_TEMPLATES,
  SwapRequestPayload,
  SwapRequestPayloadSchema,
  template,
} from "@/lib/swap-request";
import { decryptValue, encryptValue } from "@/lib/encrypt";
import { getDefaultUsername } from "@/lib/user";
import { Id } from "./_generated/dataModel";
import { GetSwapRequestByIdResult } from "./swapRequests";
import { getIdentityFromAction } from "./utils";

type ToggleSwapRequestResult = {
  success: true;
  toggledTo: boolean;
};

export const sendSwapRequest = action({
  args: {
    targetSwapperId: v.id("swapper"),
    middlemanSwapperId: v.optional(v.id("swapper")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthorized");

    const lock = new Lock({
      id: `findex:send_swap_request:${args.targetSwapperId}`,
      lease: 5000,
      redis,
    });
    try {
      if (!(await lock.acquire())) {
        throw new ConvexError("Failed to acquire lock");
      }
      const result = await ctx.runMutation(internal.tasks.requestSwap, {
        targetSwapperId: args.targetSwapperId,
        middlemanSwapperId: args.middlemanSwapperId,
      });

      const { requestId, course, initiator, target, middleman } = result;

      const templatePayload = {
        courseCode: course.code,
        courseName: course.name,
        initiator: {
          username: initiator.username,
          telegram: initiator.telegramUserId.toString(),
          index: initiator.index,
        },
        target: {
          username: target.username,
          telegram: target.telegramUserId.toString(),
          index: target.index,
        },
        middleman: {
          username: "",
          telegram: "",
          index: "",
        },
        decliner: {
          username: null,
        },
      };
      const ay = {
        ay: course.ay,
        semester: course.semester,
      };
      if (middleman) {
        templatePayload.middleman = {
          username: middleman.username,
          telegram: middleman.telegramUserId.toString(),
          index: middleman.index,
        };
        const middlemanMessage = template(
          MESSAGE_TEMPLATES.threeWay.initiator.request.target,
          templatePayload,
          ay
        );
        const targetMessage = template(
          MESSAGE_TEMPLATES.threeWay.initiator.request.target,
          templatePayload,
          ay
        );

        const targetSwapPayload: SwapRequestPayload = {
          requestId,
          swapperId: target.id,
        };
        const middlemanSwapPayload: SwapRequestPayload = {
          requestId,
          swapperId: middleman.id,
        };

        const encryptedTargetSwapPayload = await encryptValue(
          JSON.stringify(targetSwapPayload),
          env.ENCRYPTION_KEY
        );
        const encryptedMiddlemanSwapPayload = await encryptValue(
          JSON.stringify(middlemanSwapPayload),
          env.ENCRYPTION_KEY
        );
        const targetRequestUrl = `${env.NEXT_APP_URL.replace(/\/$/, "")}/request/${encodeURIComponent(
          encryptedTargetSwapPayload
        )}`;
        const middlemanRequestUrl = `${env.NEXT_APP_URL.replace(/\/$/, "")}/request/${encodeURIComponent(
          encryptedMiddlemanSwapPayload
        )}`;

        await Promise.all([
          bot
            .sendMessage(Number(middleman.telegramUserId), middlemanMessage, {
              parse_mode: "Markdown",
              disable_web_page_preview: true,
              reply_markup: {
                keyboard: [
                  [
                    {
                      text: "View",
                      web_app: {
                        url: middlemanRequestUrl,
                      },
                    },
                  ],
                ],
              },
            })
            .catch((error) => {
              console.error(
                `Error sending message to ${middleman.telegramUserId}:`,
                error
              );
            }),
          bot
            .sendMessage(Number(target.telegramUserId), targetMessage, {
              parse_mode: "Markdown",
              disable_web_page_preview: true,
              reply_markup: {
                keyboard: [
                  [
                    {
                      text: "View",
                      web_app: {
                        url: targetRequestUrl,
                      },
                    },
                  ],
                ],
              },
            })
            .catch((error) => {
              console.error(
                `Error sending message to ${target.telegramUserId}:`,
                error
              );
            }),
        ]);
      } else {
        const targetMessage = template(
          MESSAGE_TEMPLATES.direct.initiator.request.target,
          templatePayload,
          ay
        );

        const targetSwapPayload: SwapRequestPayload = {
          requestId,
          swapperId: target.id,
        };
        const encryptedTargetSwapPayload = await encryptValue(
          JSON.stringify(targetSwapPayload),
          env.ENCRYPTION_KEY
        );
        const targetRequestUrl = `${env.NEXT_APP_URL.replace(/\/$/, "")}/request/${encodeURIComponent(
          encryptedTargetSwapPayload
        )}`;

        await bot
          .sendMessage(Number(target.telegramUserId), targetMessage, {
            parse_mode: "Markdown",
            disable_web_page_preview: true,
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "View",
                    web_app: {
                      url: targetRequestUrl,
                    },
                  },
                ],
              ],
            },
          })
          .catch((error) => {
            console.error(
              `Error sending message to ${target.telegramUserId}:`,
              error
            );
          });
      }
    } catch (error) {
      console.error(`Error sending swap request:`, error);
      throw error;
    } finally {
      await lock.release().catch((error) => {
        console.error(`Error releasing lock:`, error);
      });
    }
  },
});

export const toggleSwapRequest = action({
  args: {
    courseCode: v.string(),
    hasSwapped: v.boolean(),
  },
  handler: async (ctx, args): Promise<ToggleSwapRequestResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthorized");

    const result = await ctx.runMutation(internal.tasks.toggleSwapRequest, {
      courseCode: args.courseCode,
      hasSwapped: args.hasSwapped,
    });

    if (!args.hasSwapped || result.toDecline.length === 0) {
      return {
        success: true,
        toggledTo: args.hasSwapped,
      };
    }

    const sendMessage = async (userId: bigint, msg: string) => {
      if (msg === "") return;
      await bot
        .sendMessage(Number(userId), msg, {
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        })
        .catch((error) => {
          console.error(`Error sending message to ${userId}:`, error);
        });
    };

    const msg = template(
      MESSAGE_TEMPLATES.decline.noLongerSwapping,
      {
        courseCode: result.course.code,
        courseName: result.course.name,
        decliner: {
          username: result.me.username,
        },
        initiator: {
          username: null,
          telegram: null,
          index: null,
        },
        target: {
          username: null,
          telegram: null,
          index: null,
        },
        middleman: {
          username: null,
          telegram: null,
          index: null,
        },
      },
      {
        ay: result.course.ay,
        semester: result.course.semester,
      }
    );

    await Promise.all(
      result.toDecline.map((user) => sendMessage(user.telegramUserId, msg))
    );

    return result;
  },
});

export const getSwapRequestByEncryptedPayload = action({
  args: {
    encryptedPayload: v.string(),
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    if (env.API_KEY !== args.apiKey) {
      throw new ConvexError("Invalid API key");
    }
    const decryptedPayload = await decryptValue(
      args.encryptedPayload,
      env.ENCRYPTION_KEY
    );
    const payload = SwapRequestPayloadSchema.parse(
      JSON.parse(decryptedPayload)
    );
    const result: GetSwapRequestByIdResult = await ctx.runQuery(
      internal.swapRequests.getSwapRequestById,
      {
        requestId: payload.requestId as Id<"swap_requests">,
        swapperId: payload.swapperId as Id<"swapper">,
      }
    );
    return result;
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

type SwapRequestDecisionUserArg =
  | {
      type: "swapper";
      swapperId: Id<"swapper">;
    }
  | {
      type: "user";
      email: string;
      // userId: Id<"users">;
    };

async function processSwapRequestDecision(
  ctx: ActionCtx,
  args: {
    requestId: Id<"swap_requests">;
    user: SwapRequestDecisionUserArg;
    action: "accept" | "decline";
    shouldMarkAsSwappedIfDecline: boolean;
    lockId: string;
  }
): Promise<GetSwapRequestByIdResult> {
  const lock = new Lock({
    id: `swap_decision:${args.lockId}`,
    lease: 5000,
    redis,
  });
  try {
    if (!(await lock.acquire())) {
      throw new ConvexError("Failed to acquire lock");
    }
    const result = await ctx.runMutation(
      internal.swapRequests.handleSwapRequestDecision,
      {
        requestId: args.requestId,
        user: args.user,
        action: args.action,
        shouldMarkAsSwappedIfDecline: args.shouldMarkAsSwappedIfDecline,
      }
    );

    const templatePayload = {
      courseCode: result.course.code,
      courseName: result.course.name,
      initiator: {
        username: result.initiator.username,
        telegram: result.initiator.handle,
        index: result.initiator.index,
      },
      target: {
        username: result.target.username,
        telegram: result.target.handle,
        index: result.target.index,
      },
      middleman: {
        username: result.middleman?.username ?? null,
        telegram: result.middleman?.handle ?? null,
        index: result.middleman?.index ?? null,
      },
      decliner: {
        username: result.me.username,
      },
    };
    const ay = {
      ay: result.course.ay,
      semester: result.course.semester,
    };

    let messageForInitiator = "";
    let messageForTarget = "";
    let messageForMiddleman = "";

    const isAccept = result.action === "accept";
    // Three way
    if (result.middleman) {
      if (result.iam === "initiator") {
        console.warn(
          "Unhandled state where the initiator accepted a 3 way swap request. Initiator should not be able to accept a 3 way swap request."
        );
      } else if (result.iam === "target") {
        messageForInitiator = template(
          isAccept
            ? MESSAGE_TEMPLATES.threeWay.target.accept.initiator(
                result.middleman.hasAccepted
              )
            : MESSAGE_TEMPLATES.threeWay.target.decline.initiator,
          templatePayload,
          ay
        );
        messageForMiddleman = template(
          isAccept
            ? MESSAGE_TEMPLATES.threeWay.target.accept.middleman(
                result.middleman.hasAccepted
              )
            : MESSAGE_TEMPLATES.threeWay.target.decline.middleman,
          templatePayload,
          ay
        );
        messageForTarget = template(
          isAccept
            ? MESSAGE_TEMPLATES.threeWay.target.accept.target(
                result.middleman.hasAccepted
              )
            : MESSAGE_TEMPLATES.threeWay.target.decline.target,
          templatePayload,
          ay
        );
      } else if (result.iam === "middleman") {
        messageForInitiator = template(
          isAccept
            ? MESSAGE_TEMPLATES.threeWay.middleman.accept.initiator(
                result.target.hasAccepted
              )
            : MESSAGE_TEMPLATES.threeWay.middleman.decline.initiator,
          templatePayload,
          ay
        );
        messageForMiddleman = template(
          isAccept
            ? MESSAGE_TEMPLATES.threeWay.middleman.accept.middleman(
                result.target.hasAccepted
              )
            : MESSAGE_TEMPLATES.threeWay.middleman.decline.middleman,
          templatePayload,
          ay
        );
        messageForTarget = template(
          isAccept
            ? MESSAGE_TEMPLATES.threeWay.middleman.accept.target(
                result.target.hasAccepted
              )
            : MESSAGE_TEMPLATES.threeWay.middleman.decline.target,
          templatePayload,
          ay
        );
      }
    }
    // Direct
    else {
      if (result.iam === "target") {
        messageForInitiator = template(
          isAccept
            ? MESSAGE_TEMPLATES.direct.target.accept.initiator
            : MESSAGE_TEMPLATES.direct.target.decline.initiator,
          templatePayload,
          ay
        );
        messageForTarget = template(
          isAccept
            ? MESSAGE_TEMPLATES.direct.target.accept.target
            : MESSAGE_TEMPLATES.direct.target.decline.target,
          templatePayload,
          ay
        );
      } else {
        console.warn(
          "Unhandled state where the middleman accepted a direct swap request. Middleman should not be able to accept a direct swap request."
        );
      }
    }

    const sendMessage = async (userId: bigint, msg: string) => {
      if (msg === "") return;
      if (!userId) return;
      await bot
        .sendMessage(Number(userId), msg, {
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        })
        .catch((error) => {
          console.error(`Error sending message to ${userId}:`, error);
        });
    };

    await Promise.all([
      sendMessage(result.initiator.telegramUserId, messageForInitiator),
      sendMessage(result.target.telegramUserId, messageForTarget),
      result.middleman
        ? sendMessage(result.middleman.telegramUserId, messageForMiddleman)
        : Promise.resolve(),
      ...result.otherDeclineNotifications.map((notification) => {
        let msg = "";
        if (notification.reason === "no-longer-swapping") {
          msg = template(
            MESSAGE_TEMPLATES.decline.noLongerSwapping,
            templatePayload,
            ay
          );
        } else if (notification.reason === "found-a-swap") {
          msg = template(
            MESSAGE_TEMPLATES.decline.foundASwap,
            templatePayload,
            ay
          );
        }
        return sendMessage(notification.for.telegramUserId, msg);
      }),
    ]);

    const updatedRequest: GetSwapRequestByIdResult = await ctx.runQuery(
      internal.swapRequests.getSwapRequestById,
      {
        requestId: result.requestId,
        swapperId: result.meSwapperId,
      }
    );
    return updatedRequest;
  } catch (error) {
    console.error(`Error handling swap request decision:`, error);
    throw error;
  } finally {
    await lock.release().catch((error) => {
      console.error(`Error releasing lock:`, error);
    });
  }
}

export const handleSwapRequestDecisionByEncryptedPayload = action({
  args: {
    encryptedPayload: v.string(),
    action: v.union(v.literal("accept"), v.literal("decline")),
    shouldMarkAsSwappedIfDecline: v.boolean(),
  },
  handler: async (ctx, args): Promise<GetSwapRequestByIdResult> => {
    const decryptedPayload = await decryptValue(
      args.encryptedPayload,
      env.ENCRYPTION_KEY
    );
    const payload = SwapRequestPayloadSchema.parse(
      JSON.parse(decryptedPayload)
    );
    return await processSwapRequestDecision(ctx, {
      // request: {
      //   type: "id",
      //   id: payload.requestId as Id<"swap_requests">,
      // },
      requestId: payload.requestId as Id<"swap_requests">,
      user: {
        type: "swapper",
        swapperId: payload.swapperId as Id<"swapper">,
      },
      action: args.action,
      shouldMarkAsSwappedIfDecline: args.shouldMarkAsSwappedIfDecline,
      lockId: String(payload.requestId),
    });
  },
});

export const handleSwapRequestDecision = action({
  args: {
    requestId: v.id("swap_requests"),
    action: v.union(v.literal("accept"), v.literal("decline")),
    shouldMarkAsSwappedIfDecline: v.boolean(),
  },
  handler: async (ctx, args): Promise<GetSwapRequestByIdResult> => {
    const { email } = await getIdentityFromAction(ctx);

    return await processSwapRequestDecision(ctx, {
      requestId: args.requestId,
      user: {
        type: "user",
        email,
      },
      action: args.action,
      shouldMarkAsSwappedIfDecline: args.shouldMarkAsSwappedIfDecline,
      lockId: `${args.requestId}`,
    });
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
    const telegramHandle = args.fromUsername ?? `user_${args.fromId}`;

    try {
      const result = await ctx.runMutation(
        internal.tasks.verifyTelegramAccount,
        {
          email,
          code,
          telegramUserId: BigInt(args.fromId),
          telegramHandle,
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

    // Microsoft username generated.
    let username = identity.microsoftName as string | undefined;
    if (!username) {
      throw new ConvexError("Username not found");
    }
    username = getDefaultUsername(username);

    if (args.telegramRawInitData) {
      if (!isValid(args.telegramRawInitData, env.BOT_KEY)) {
        throw new ConvexError("Invalid Telegram init data");
      }
      const initData = parse(args.telegramRawInitData);
      if (!initData.user) {
        throw new ConvexError("Invalid Telegram init data");
      }
      const telegramUserId = BigInt(initData.user.id);

      const telegramHandle = initData.user.username;
      if (!telegramHandle) {
        throw new ConvexError("Invalid Telegram username");
      }

      // If valid, then do the link process
      const result = await ctx.runMutation(
        internal.tasks.verifyTelegramAccount,
        {
          email,
          code: "",
          directCreation: {
            username,
          },
          telegramUserId,
          telegramHandle,
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

    return await ctx.runMutation(internal.tasks.requestLinkTelegramAccount, {
      username,
    });
  },
});
