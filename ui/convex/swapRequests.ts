import { ConvexError, v } from "convex/values";
import { internalQuery, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export type GetSwapRequestByIdResult = {
  requestId: Id<"swap_requests">;
  isCompleted: boolean;
  iam: "initiator" | "target" | "middleman";
  course: {
    code: string;
    name: string;
  };
  initiator: {
    id: Id<"swapper">;
    telegramUserId: bigint;
    handle: string;
    index: string;
    username: string;
    hasAccepted: boolean;
  };
  target: {
    id: Id<"swapper">;
    telegramUserId: bigint;
    handle: string;
    index: string;
    username: string;
    hasAccepted: boolean;
  };
  middleman:
    | {
        id: Id<"swapper">;
        telegramUserId: bigint;
        handle: string;
        index: string;
        username: string;
        hasAccepted: boolean;
      }
    | undefined;
};

export const getSwapRequestById = internalQuery({
  args: {
    requestId: v.id("swap_requests"),
    swapperId: v.id("swapper"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new ConvexError("Swap request not found.");
    }
    const [initiator, targetSwapper, middlemanSwapper] = await Promise.all([
      ctx.db.get(request.initiator),
      ctx.db.get(request.targetSwapper),
      request.middlemanSwapper ? ctx.db.get(request.middlemanSwapper) : null,
    ]);
    if (!initiator || !targetSwapper) {
      throw new ConvexError("Swap request participants not found.");
    }
    if (!middlemanSwapper && request.middlemanSwapper !== undefined) {
      throw new ConvexError("Middleman swapper not found.");
    }
    const [initiatorUser, targetSwapperUser, middlemanSwapperUser, course] =
      await Promise.all([
        ctx.db.get(initiator.userId),
        ctx.db.get(targetSwapper.userId),
        middlemanSwapper ? ctx.db.get(middlemanSwapper.userId) : null,
        ctx.db.get(request.courseId),
      ]);
    if (!course) {
      throw new ConvexError("Course not found.");
    }
    if (!initiatorUser || !targetSwapperUser) {
      throw new ConvexError("Swap request participants not found.");
    }
    if (middlemanSwapper && !middlemanSwapperUser) {
      throw new ConvexError("Swap request participants not found.");
    }

    let iam: "initiator" | "target" | "middleman" = "initiator";
    if (middlemanSwapper?._id === args.swapperId) {
      iam = "middleman";
    } else if (targetSwapper._id === args.swapperId) {
      iam = "target";
    }
    const result: GetSwapRequestByIdResult = {
      requestId: request._id,
      isCompleted: request.isCompleted,
      iam,
      course: {
        code: course.code,
        name: course.name,
      },
      initiator: {
        id: initiator._id,
        telegramUserId: initiatorUser.telegramUserId,
        handle: initiatorUser.handle,
        index: initiator.index,
        username: initiatorUser.username,
        hasAccepted: request.acceptedByInitiator,
      },
      target: {
        id: targetSwapper._id,
        telegramUserId: targetSwapperUser.telegramUserId,
        handle: targetSwapperUser.handle,
        index: targetSwapper.index,
        username: targetSwapperUser.username,
        hasAccepted: request.acceptedByTargetSwapper,
      },
      middleman:
        middlemanSwapper && middlemanSwapperUser
          ? {
              id: middlemanSwapper._id,
              telegramUserId: middlemanSwapperUser.telegramUserId,
              handle: middlemanSwapperUser.handle,
              index: middlemanSwapper.index,
              username: middlemanSwapperUser.username,
              hasAccepted: request.acceptedByMiddlemanSwapper,
            }
          : undefined,
    };
    // return "HELLO";
    return result;
  },
});
