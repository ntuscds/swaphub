import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
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

export const handleSwapRequestDecision = internalMutation({
  args: {
    requestId: v.id("swap_requests"),
    swapperId: v.id("swapper"),
    action: v.union(v.literal("accept"), v.literal("decline")),
    shouldMarkAsSwappedIfDecline: v.boolean(),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new ConvexError("Swap request not found.");
    }
    if (request.isCompleted) {
      throw new ConvexError("Swap request already completed.");
    }
    let iam: "initiator" | "target" | "middleman" = "initiator";
    if (request.initiator === args.swapperId) {
      iam = "initiator";
    } else if (request.targetSwapper === args.swapperId) {
      iam = "target";
    } else if (request.middlemanSwapper === args.swapperId) {
      iam = "middleman";
    }

    const [initiatorSwapper, targetSwapper, middlemanSwapper] =
      await Promise.all([
        ctx.db.get(request.initiator),
        ctx.db.get(request.targetSwapper),
        request.middlemanSwapper ? ctx.db.get(request.middlemanSwapper) : null,
      ]);
    if (!initiatorSwapper || !targetSwapper) {
      throw new ConvexError("Swap request participants not found.");
    }
    if (middlemanSwapper && !middlemanSwapper) {
      throw new ConvexError("Middleman swapper not found.");
    }

    const [initiatorUser, targetSwapperUser, middlemanSwapperUser] =
      await Promise.all([
        ctx.db.get(initiatorSwapper.userId),
        ctx.db.get(targetSwapper.userId),
        middlemanSwapper ? ctx.db.get(middlemanSwapper.userId) : null,
      ]);
    if (!initiatorUser || !targetSwapperUser) {
      throw new ConvexError("Swap request participants not found.");
    }
    if (middlemanSwapperUser && !middlemanSwapperUser) {
      throw new ConvexError("Middleman swapper user not found.");
    }

    const course = await ctx.db.get(request.courseId);
    if (!course) {
      throw new ConvexError("Course not found.");
    }

    let initiatorAccepted = request.acceptedByInitiator;
    let targetSwapperAccepted = request.acceptedByTargetSwapper;
    let middlemanSwapperAccepted = request.acceptedByMiddlemanSwapper;

    let isCompleted: boolean = false;
    let everyoneAccepted: boolean = false;
    let meSwapperId: Id<"swapper"> | null = null;
    let user: typeof initiatorUser | null = null;
    if (iam === "initiator") {
      initiatorAccepted = args.action === "accept";
      everyoneAccepted =
        initiatorAccepted &&
        targetSwapperAccepted &&
        (request.middlemanSwapper === undefined || middlemanSwapperAccepted);
      isCompleted =
        args.action === "decline"
          ? true // Declined, so mark as completed.
          : everyoneAccepted;
      await ctx.db.patch(request._id, {
        acceptedByInitiator: initiatorAccepted,
        isCompleted,
      });
      meSwapperId = initiatorSwapper._id;
      user = initiatorUser;
    } else if (iam === "target") {
      targetSwapperAccepted = args.action === "accept";
      everyoneAccepted =
        initiatorAccepted &&
        targetSwapperAccepted &&
        (request.middlemanSwapper === undefined || middlemanSwapperAccepted);
      isCompleted =
        args.action === "decline"
          ? true // Declined, so mark as completed.
          : everyoneAccepted;
      await ctx.db.patch(request._id, {
        acceptedByTargetSwapper: targetSwapperAccepted,
        isCompleted,
      });
      meSwapperId = targetSwapper._id;
      user = targetSwapperUser;
    } else if (iam === "middleman") {
      if (!middlemanSwapper) {
        throw new ConvexError(
          "Middleman swapper not found, this should not happen."
        );
      }
      middlemanSwapperAccepted = args.action === "accept";
      everyoneAccepted =
        initiatorAccepted && targetSwapperAccepted && middlemanSwapperAccepted;
      isCompleted =
        args.action === "decline"
          ? true // Declined, so mark as completed.
          : everyoneAccepted;
      await ctx.db.patch(request._id, {
        acceptedByMiddlemanSwapper: middlemanSwapperAccepted,
        isCompleted,
      });
      meSwapperId = middlemanSwapper._id;
      user = middlemanSwapperUser;
    }

    if (meSwapperId === null) {
      throw new ConvexError("Me swapper not found, this should not happen.");
    }
    if (user === null) {
      throw new ConvexError("User not found, this should not happen.");
    }

    let declineNotifications: {
      for: {
        telegramUserId: bigint;
      };
      reason: "no-longer-swapping" | "found-a-swap" | "not-interested";
    }[] = [];
    const ignoreParticipants = [
      initiatorSwapper._id,
      targetSwapper._id,
      middlemanSwapper?._id,
    ].filter((id) => id !== undefined);
    const addDecline = async (
      swapperId: Id<"swapper">,
      reason: (typeof declineNotifications)[number]["reason"]
    ) => {
      if (ignoreParticipants.includes(swapperId)) {
        return;
      }
      const swapper = await ctx.db.get(swapperId);
      if (!swapper) {
        return;
      }
      const user = await ctx.db.get(swapper.userId);
      if (!user) {
        return;
      }
      declineNotifications.push({
        for: {
          telegramUserId: user.telegramUserId,
        },
        reason,
      });
    };

    if (args.action === "decline") {
      if (args.shouldMarkAsSwappedIfDecline) {
        await ctx.db.patch(meSwapperId, { hasSwapped: true });
        // Retrieve requests to decline.
        const requests = await ctx.db
          .query("swap_requests")
          .filter((q) => {
            return q.and(
              q.eq(q.field("isCompleted"), false),
              q.eq(q.field("courseId"), course._id),
              q.not(q.eq(q.field("_id"), request._id)),
              q.or(
                q.eq(q.field("initiator"), meSwapperId),
                q.eq(q.field("targetSwapper"), meSwapperId),
                q.eq(q.field("middlemanSwapper"), meSwapperId)
              )
            );
          })
          .collect();

        const uniqueSwapperIds = [
          ...new Set(
            requests.reduce((acc, r) => {
              acc.push(r.initiator);
              acc.push(r.targetSwapper);
              if (r.middlemanSwapper) {
                acc.push(r.middlemanSwapper);
              }
              return acc;
            }, [] as Id<"swapper">[])
          ),
        ];
        await Promise.all([
          ...uniqueSwapperIds.map((swapperId) =>
            addDecline(swapperId, "no-longer-swapping")
          ),
          ...requests.map((r) => ctx.db.patch(r._id, { isCompleted: true })),
        ]);
      } else {
        await addDecline(meSwapperId, "not-interested");
      }
    }

    // Check if everyone has accepted the swap.
    if (isCompleted && everyoneAccepted) {
      const [requestsToDecline, , ,] = await Promise.all([
        // Retrieve requests to decline.
        ctx.db
          .query("swap_requests")
          .filter((q) => {
            const orChecks = [
              q.eq(q.field("initiator"), initiatorSwapper._id),
              q.eq(q.field("initiator"), targetSwapper._id),
              q.eq(q.field("targetSwapper"), initiatorSwapper._id),
              q.eq(q.field("targetSwapper"), targetSwapper._id),
              q.eq(q.field("middlemanSwapper"), initiatorSwapper._id),
              q.eq(q.field("middlemanSwapper"), targetSwapper._id),
            ];
            if (middlemanSwapper) {
              orChecks.push(
                q.eq(q.field("initiator"), middlemanSwapper._id),
                q.eq(q.field("targetSwapper"), middlemanSwapper._id),
                q.eq(q.field("middlemanSwapper"), middlemanSwapper._id)
              );
            }
            return q.and(
              q.eq(q.field("isCompleted"), false),
              q.eq(q.field("courseId"), course._id),
              q.not(q.eq(q.field("_id"), request._id)),
              q.or(...orChecks)
            );
          })
          .collect(),
        // Update hasSwapped for all participants.
        ctx.db.patch(initiatorSwapper._id, { hasSwapped: true }),
        ctx.db.patch(targetSwapper._id, { hasSwapped: true }),
        (async () => {
          if (middlemanSwapper) {
            await ctx.db.patch(middlemanSwapper._id, { hasSwapped: true });
          }
        })(),
      ]);

      const uniqueSwapperIds = [
        ...new Set(
          requestsToDecline.reduce((acc, r) => {
            acc.push(r.initiator);
            acc.push(r.targetSwapper);
            if (r.middlemanSwapper) {
              acc.push(r.middlemanSwapper);
            }
            return acc;
          }, [] as Id<"swapper">[])
        ),
      ];

      // Decline all other requests.
      await Promise.all([
        ...uniqueSwapperIds.map((swapperId) =>
          addDecline(swapperId, "no-longer-swapping")
        ),
        ...requestsToDecline.map((r) =>
          ctx.db.patch(r._id, { isCompleted: true })
        ),
      ]);
    }

    return {
      action: args.action,
      declineNotifications,
      isCompleted,
      course: {
        code: course.code,
        name: course.name,
        ay: course.ay,
        semester: course.semester,
      },
      iam,
      me: {
        username: user.username,
      },
      initiator: {
        handle: initiatorUser.handle,
        telegramUserId: initiatorUser.telegramUserId,
        username: initiatorUser.username,
        index: initiatorSwapper.index,
        hasAccepted: initiatorAccepted,
      },
      target: {
        handle: targetSwapperUser.handle,
        telegramUserId: targetSwapperUser.telegramUserId,
        username: targetSwapperUser.username,
        index: targetSwapper.index,
        hasAccepted: targetSwapperAccepted,
      },
      middleman:
        middlemanSwapperUser && middlemanSwapper
          ? {
              handle: middlemanSwapperUser.handle,
              telegramUserId: middlemanSwapperUser.telegramUserId,
              username: middlemanSwapperUser.username,
              index: middlemanSwapper.index,
              hasAccepted: middlemanSwapperAccepted,
            }
          : null,
    };
  },
});
