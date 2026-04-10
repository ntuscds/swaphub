"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { ConvexError } from "convex/values";
import { bot } from "@/telegram/telegram";
import { api, internal } from "./_generated/api";
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
import { FunctionReturnType } from "convex/server";

function escapeMarkdown(text: string): string {
  return text.replace(/([_*`[\]()~])/g, "\\$1");
}

type ToggleSwapRequestCancelledParticipant = {
  handle: string;
  telegramUserId: bigint;
};

type ToggleSwapRequestCancelledRequest = {
  isDirectSwap: boolean;
  iam: "initiator" | "targetSwapper" | "middlemanSwapper";
  course: { code: string; name: string };
  initiator: ToggleSwapRequestCancelledParticipant;
  targetSwapper: ToggleSwapRequestCancelledParticipant;
  middlemanSwapper: ToggleSwapRequestCancelledParticipant | null;
};

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
                inline_keyboard: [
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

    // Acquire lock to prevent concurrent requests.
    const lock = new Lock({
      id: `findex:tg_wh:${payload.requestId}`,
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
          requestId: payload.requestId as Id<"swap_requests">,
          swapperId: payload.swapperId as Id<"swapper">,
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

      // Send messages, including any declined messages.
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
          requestId: payload.requestId as Id<"swap_requests">,
          swapperId: payload.swapperId as Id<"swapper">,
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
      lock.release().catch(() => {});
      //       try {
      //         const lockKey = `telegram:webhook:${args.payloadId}`;
      //         const lockValue = await redis.get(lockKey);
      //         if (lockValue) {
      //           return { ok: true as const };
      //         }
      //         const {
      //           action,
      //           isDirectSwap,
      //           isCompleted,
      //           course,
      //           iam,
      //           initiator,
      //           targetSwapper,
      //           middlemanSwapper,
      //         } = await ctx.runMutation(
      //           internal.tasks.handleSwapRequestWebhookCallback,
      //           {
      //             payloadId: args.payloadId,
      //             fromTelegramUserId: BigInt(args.fromId),
      //           }
      //         );
      //         const courseLabel = `${course.code} ${course.name}`;
      //         let msgForInitiator = "";
      //         let msgForMiddlemanSwapper = "";
      //         let msgForTargetSwapper = "";
      //         const setMessageForMe = (msg: string) => {
      //           if (iam === "middlemanSwapper") {
      //             msgForMiddlemanSwapper = msg;
      //           } else if (iam === "targetSwapper") {
      //             msgForTargetSwapper = msg;
      //           } else {
      //             throw new ConvexError("Invalid iam");
      //           }
      //         };
      //         if (action === "accept") {
      //           if (isDirectSwap) {
      //             if (iam === "middlemanSwapper") {
      //               throw new ConvexError(
      //                 "Middleman swapper cannot accept direct swap request. How did this happen?"
      //               );
      //             }
      //             // Initiator declined the swap.
      //             if (!isCompleted) {
      //               setMessageForMe(`*Swap failed for ${escapeMarkdown(courseLabel)}*.
      // It seems that this request is no longer valid.`);
      //             } else {
      //               msgForTargetSwapper = `*Swap confirmation for ${escapeMarkdown(courseLabel)}*.
      // You have accepted @${escapeMarkdown(initiator.handle)}'s swap request, message them to proceed with the swap!.`;
      //               msgForInitiator = `*Swap confirmation for ${escapeMarkdown(courseLabel)}*.
      // @${escapeMarkdown(targetSwapper.handle)} has accepted your swap request, message them to proceed with the swap!.`;
      //             }
      //           }
      //           // 3 Way Swap
      //           else {
      //             if (!middlemanSwapper) {
      //               throw new ConvexError("Middleman swapper not found.");
      //             }
      //             // Initiator declined the swap.
      //             if (!initiator.acceptedByInitiator) {
      //               setMessageForMe(`*Swap failed for ${escapeMarkdown(courseLabel)}*.
      // It seems that this request is no longer valid.`);
      //             } else {
      //               const swapSequenceMessageInitiator = `First, YOU (${initiator.index}) <-> ${escapeMarkdown(middlemanSwapper.handle)} (${middlemanSwapper.index}) swap.
      //               Then, YOU (${middlemanSwapper.index}) <-> ${escapeMarkdown(targetSwapper.handle)} (${targetSwapper.index}) swap.`;
      //               const swapSequenceMessageTarget = `Wait for (${escapeMarkdown(initiator.handle)} (${initiator.index}) <-> ${escapeMarkdown(middlemanSwapper.handle)} (${middlemanSwapper.index}) swap.
      //               Then, YOU (${targetSwapper.index}) <-> ${escapeMarkdown(middlemanSwapper.handle)} (${middlemanSwapper.index})`;
      //               const swapSequenceMessageMiddleman = ` YOU (${middlemanSwapper.index}) <-> ${escapeMarkdown(initiator.handle)} (${initiator.index}) swap.`;
      //               if (iam === "middlemanSwapper") {
      //                 if (!isCompleted) {
      //                   msgForMiddlemanSwapper = `*Swap pending confirmation for ${escapeMarkdown(courseLabel)}*.
      // You have accepted @${escapeMarkdown(initiator.handle)}'s request.
      // 2 / 3 confirmations received.`;
      //                   msgForInitiator = `*Swap pending confirmation for ${escapeMarkdown(courseLabel)}*.
      // @${escapeMarkdown(middlemanSwapper.handle)} has accepted your request.
      // 2 / 3 confirmations received.`;
      //                   msgForTargetSwapper = `*Swap pending confirmation for ${escapeMarkdown(courseLabel)}*.
      // @${escapeMarkdown(middlemanSwapper.handle)} has accepted a 3 way swap request you are participating in.
      // 2 / 3 confirmations received.
      // You have yet to confirm this swap request.`;
      //                 } else {
      //                   msgForMiddlemanSwapper = `*Swap confirmed for ${escapeMarkdown(courseLabel)}*.
      // You have accepted @${escapeMarkdown(initiator.handle)}'s request, finalising the 3 way swap between you, @${escapeMarkdown(targetSwapper.handle)} and @${escapeMarkdown(middlemanSwapper.handle)}.
      // ${swapSequenceMessageMiddleman}
      // Message them to proceed with the swap!`;
      //                   msgForTargetSwapper = `*Swap confirmed for ${escapeMarkdown(courseLabel)}*.
      // @${escapeMarkdown(middlemanSwapper.handle)} has accepted a 3 way swap request you are participating in, finalising the swap between you, @${escapeMarkdown(initiator.handle)} and @${escapeMarkdown(middlemanSwapper.handle)}.
      // ${swapSequenceMessageTarget}
      // Message them to proceed with the swap!`;
      //                   msgForInitiator = `*Swap confirmed for ${escapeMarkdown(courseLabel)}*.
      // @${escapeMarkdown(middlemanSwapper.handle)} has accepted your 3 way swap request, finalising the swap between you, @${escapeMarkdown(middlemanSwapper.handle)} and @${escapeMarkdown(targetSwapper.handle)}.
      // ${swapSequenceMessageInitiator}
      // Message them to proceed with the swap!`;
      //                 }
      //               } else if (iam === "targetSwapper") {
      //                 if (!isCompleted) {
      //                   msgForTargetSwapper = `*Swap pending confirmation for ${escapeMarkdown(courseLabel)}*.
      // You have accepted @${escapeMarkdown(initiator.handle)}'s request.
      // 2 / 3 confirmations received.`;
      //                   msgForInitiator = `*Swap pending confirmation for ${escapeMarkdown(courseLabel)}*.
      // @${escapeMarkdown(middlemanSwapper.handle)} has accepted your request.
      // 2 / 3 confirmations received.`;
      //                   msgForMiddlemanSwapper = `*Swap pending confirmation for ${escapeMarkdown(courseLabel)}*.
      // @${escapeMarkdown(middlemanSwapper.handle)} has accepted a 3 way swap request you are participating in.
      // 2 / 3 confirmations received.
      // You have yet to confirm this swap request.`;
      //                 } else {
      //                   msgForTargetSwapper = `*Swap confirmed for ${escapeMarkdown(courseLabel)}*.
      // You have accepted @${escapeMarkdown(initiator.handle)}'s request, finalising the 3 way swap between you, @${escapeMarkdown(middlemanSwapper.handle)} and @${escapeMarkdown(targetSwapper.handle)}.
      // ${swapSequenceMessageTarget}
      // Message them to proceed with the swap!`;
      //                   msgForInitiator = `*Swap confirmed for ${escapeMarkdown(courseLabel)}*.
      // @${escapeMarkdown(targetSwapper.handle)} has accepted your 3 way swap request, finalising the swap between you, @${escapeMarkdown(initiator.handle)} and @${escapeMarkdown(middlemanSwapper.handle)}.
      // ${swapSequenceMessageInitiator}
      // Message them to proceed with the swap!`;
      //                   msgForMiddlemanSwapper = `*Swap confirmed for ${escapeMarkdown(courseLabel)}*.
      // @${escapeMarkdown(targetSwapper.handle)} has accepted a 3 way swap request you are participating in, finalising the swap between you, @${escapeMarkdown(initiator.handle)} and @${escapeMarkdown(targetSwapper.handle)}.
      // ${swapSequenceMessageMiddleman}
      // Message them to proceed with the swap!`;
      //                 }
      //               }
      //             }
      //           }
      //         } else {
      //           if (isDirectSwap) {
      //             msgForInitiator = `*Swap cancelled for ${escapeMarkdown(courseLabel)}*.
      // @${escapeMarkdown(targetSwapper.handle)} has declined to participate in your swap request.`;
      //             msgForTargetSwapper = `*Swap cancelled for ${escapeMarkdown(courseLabel)}*.
      // You declined to participate in @${escapeMarkdown(initiator.handle)}'s swap request.`;
      //           } else {
      //             if (!middlemanSwapper) {
      //               throw new ConvexError("Middleman swapper not found.");
      //             }
      //             if (iam === "targetSwapper") {
      //               msgForInitiator = `*Swap cancelled for ${escapeMarkdown(courseLabel)}*.
      // @${escapeMarkdown(middlemanSwapper.handle)} has declined to participate in your 3 way swap request.`;
      //               msgForTargetSwapper = `*Swap cancelled for ${escapeMarkdown(courseLabel)}*.
      // You declined to participate in @${escapeMarkdown(initiator.handle)}'s 3 way swap request.`;
      //               msgForMiddlemanSwapper = `*Swap cancelled for ${escapeMarkdown(courseLabel)}*.
      // @${escapeMarkdown(targetSwapper.handle)} has declined to participate in @${escapeMarkdown(initiator.handle)}'s 3 way swap request.`;
      //             } else if (iam === "middlemanSwapper") {
      //               msgForInitiator = `*Swap cancelled for ${escapeMarkdown(courseLabel)}*.
      // @${escapeMarkdown(targetSwapper.handle)} has declined to participate in @${escapeMarkdown(initiator.handle)}'s 3 way swap request.`;
      //               msgForMiddlemanSwapper = `*Swap cancelled for ${escapeMarkdown(courseLabel)}*.
      // You declined to participate in @${escapeMarkdown(initiator.handle)}'s 3 way swap request.`;
      //               msgForTargetSwapper = `*Swap cancelled for ${escapeMarkdown(courseLabel)}*.
      // @${escapeMarkdown(middlemanSwapper.handle)} has declined to participate in your 3 way swap request.`;
      //             }
      //           }
      //         }
      //         const sendMessage = async (userId: bigint | undefined, msg: string) => {
      //           if (msg === "") return;
      //           if (!userId) return;
      //           await bot
      //             .sendMessage(Number(userId), msg, {
      //               parse_mode: "Markdown",
      //             })
      //             .catch((error) => {
      //               console.error(`Error sending message to ${userId}:`, error);
      //             });
      //         };
      //         await Promise.all([
      //           sendMessage(initiator.telegramUserId, msgForInitiator),
      //           sendMessage(targetSwapper.telegramUserId, msgForTargetSwapper),
      //           sendMessage(middlemanSwapper?.telegramUserId, msgForMiddlemanSwapper),
      //         ]);
      //         await bot.answerCallbackQuery(args.callbackId).catch(() => {});
      //         if (args.messageChatId != null && args.messageId != null) {
      //           await bot
      //             .editMessageReplyMarkup(
      //               { inline_keyboard: [] },
      //               { chat_id: args.messageChatId, message_id: args.messageId }
      //             )
      //             .catch(() => {});
      //         }
      //         await redis.set(lockKey, "1", { ex: 60 * 5 });
      //         return { ok: true as const };
      //       } catch (error) {
      //         console.error(`Error handling callback ${args.callbackId}:`, error);
      //       } finally {
      //         await lock.release();
      //       }
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
