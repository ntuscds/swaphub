import { CurrentAcadYear } from "@/lib/acad";
import { schools } from "@/lib/types";
import { internalMutation, mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  COMMAND_PREFIX,
  deserializeAccept,
  deserializeAlreadySwapped,
  getAction,
  serializeAccept,
  serializeAlreadySwapped,
} from "@/telegram/callbacks";

const schoolValidator = v.union(...schools.map((school) => v.literal(school)));

const acadYearValidator = v.object({
  ay: v.string(),
  semester: v.union(v.literal("1"), v.literal("2")),
});

function resolveAcadYear(
  acadYear: { ay: string; semester: "1" | "2" } | undefined
) {
  return acadYear ?? CurrentAcadYear;
}

export const getSelf = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    const telegramUserId = BigInt(identity.subject);
    // if (!Number.isFinite(telegramUserId)) {
    //   throw new ConvexError("Invalid auth subject");
    // }

    return await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", telegramUserId))
      .unique();
  },
});

export const getCourses = query({
  args: {
    acadYear: v.optional(acadYearValidator),
  },
  handler: async (ctx, args) => {
    const resolvedAcadYear = resolveAcadYear(args.acadYear);
    return await ctx.db
      .query("courses")
      .filter((q) =>
        q.and(
          q.eq(q.field("ay"), resolvedAcadYear.ay),
          q.eq(q.field("semester"), resolvedAcadYear.semester)
        )
      )
      .collect();
  },
});

export const getAllRequests = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    const me = BigInt(identity.subject);

    const allMySwappers = await ctx.db
      .query("swapper")
      .withIndex("by_telegramUserId", (q) => q.eq("telegramUserId", me))
      .collect();

    return Promise.all(
      allMySwappers.map(async (request) => {
        const course = await ctx.db.get(request.courseId);
        if (!course) {
          throw new ConvexError("Course not found for swapper record");
        }
        if (request.hasSwapped) {
          return {
            course: {
              id: request.courseId,
              code: course.code,
              name: course.name,
            },
            // hasSwapped: request.hasSwapped,
            type: "swapped" as const,
            // matchCount: 0,
            // pendingRequestCount: 0,
          };
        }

        const [myWants, allSwappersInCourse, allMySwapRequests] =
          await Promise.all([
            ctx.db
              .query("swapper_wants")
              .withIndex("by_swapperId", (q) => q.eq("swapperId", request._id))
              .collect(),
            ctx.db
              .query("swapper")
              .withIndex("by_courseId", (q) =>
                q.eq("courseId", request.courseId)
              )
              .collect(),
            ctx.db
              .query("swap_requests")
              .withIndex("by_courseId", (q) =>
                q.eq("courseId", request.courseId)
              )
              .filter((q) => {
                // Either swapper1 or swapper2 is me.
                return q.or(
                  q.eq(q.field("swapper1"), request._id),
                  q.eq(q.field("swapper2"), request._id)
                );
              })
              .collect(),
          ]);

        // Collate swappers.
        const swapperMap = new Map<
          string,
          (typeof allSwappersInCourse)[number]
        >(allSwappersInCourse.map((s) => [s._id, s]));

        // Deduce which requests are pending.
        let pendingRequests: typeof allMySwapRequests = [];
        for (const request of allMySwapRequests) {
          const swapper1 = swapperMap.get(request.swapper1);
          const swapper2 = swapperMap.get(request.swapper2);
          if (!swapper1 || !swapper2) continue;

          if (swapper1.hasSwapped || swapper2.hasSwapped) continue;

          // This request is pending.
          pendingRequests.push(request);
        }

        if (pendingRequests.length > 0) {
          return {
            course: {
              id: request.courseId,
              code: course.code,
              name: course.name,
            },
            type: "pending" as const,
            pendingRequestsCount: pendingRequests.length,
          };
        }

        // Deduce number of matches. A valid match is where:
        // The other swapper has the index I want and I have the index they want.
        let matchCount = 0;
        const myWantsAsSet = new Set(myWants.map((w) => w.wantIndex));
        for (const otherSwapper of allSwappersInCourse) {
          if (otherSwapper.hasSwapped) continue;
          if (otherSwapper.telegramUserId === me) continue;
          // The other swapper has the index I want and I have the index they want.
          if (
            !myWantsAsSet.has(otherSwapper.index) ||
            otherSwapper.index !== request.index
          )
            continue;

          matchCount += 1;
        }

        return {
          course: {
            id: request.courseId,
            code: course.code,
            name: course.name,
          },
          type: "matches" as const,
          matchCount,
        };
      })
    );
  },
});

/** Course header for edit page (route still uses URL course code once). */
export const getCourseHeaderByCode = query({
  args: {
    courseCode: v.string(),
    acadYear: v.optional(acadYearValidator),
  },
  handler: async (ctx, args) => {
    const resolvedAcadYear = resolveAcadYear(args.acadYear);
    const course = await ctx.db
      .query("courses")
      .withIndex("by_code_ay_semester", (q) =>
        q
          .eq("code", args.courseCode)
          .eq("ay", resolvedAcadYear.ay)
          .eq("semester", resolvedAcadYear.semester)
      )
      .unique();

    if (!course) {
      return null;
    }

    const swappers = await ctx.db
      .query("swapper")
      .withIndex("by_courseId_index", (q) => q.eq("courseId", course._id))
      .collect();

    return {
      courseId: course._id,
      code: course.code,
      name: course.name,
      swappersCount: swappers.length,
    };
  },
});

/** Indexes for a course with aggregate have/want counts (edit form). */
export const getCourseIndexesForEdit = query({
  args: {
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    const courseId = args.courseId;

    const courseIndexes = await ctx.db
      .query("course_index")
      .withIndex("by_courseId", (q) => q.eq("courseId", args.courseId))
      .collect();

    const allSwappers = await ctx.db
      .query("swapper")
      .withIndex("by_courseId", (q) => q.eq("courseId", courseId))
      .collect();
    const allWants = await ctx.db
      .query("swapper_wants")
      .filter((q) =>
        q.or(...allSwappers.map((s) => q.eq(q.field("swapperId"), s._id)))
      )
      .collect();

    const haveCountByIndex = new Map<string, number>();
    for (const s of allSwappers) {
      haveCountByIndex.set(s.index, (haveCountByIndex.get(s.index) ?? 0) + 1);
    }
    const wantCountByIndex = new Map<string, number>();
    for (const w of allWants) {
      wantCountByIndex.set(
        w.wantIndex,
        (wantCountByIndex.get(w.wantIndex) ?? 0) + 1
      );
    }

    return courseIndexes.map((r) => ({
      id: r._id,
      index: r.index,
      haveCount: haveCountByIndex.get(r.index) ?? 0,
      wantCount: wantCountByIndex.get(r.index) ?? 0,
    }));
  },
});

/**
 * Current user's swap request for a course (Convex course document id).
 */
export const getRequestForCourse = query({
  args: {
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    const me = BigInt(identity.subject);
    const courseId = args.courseId;

    const meSwapper = await ctx.db
      .query("swapper")
      .withIndex("by_telegramUserId_courseId", (q) =>
        q.eq("telegramUserId", me).eq("courseId", courseId)
      )
      .unique();
    if (!meSwapper) {
      throw new ConvexError("Swapper not found.");
    }

    const myWants = await ctx.db
      .query("swapper_wants")
      .withIndex("by_swapperId", (q) => q.eq("swapperId", meSwapper._id))
      .collect();

    return {
      haveIndex: meSwapper.index,
      wantIndexes: myWants.map((w) => w.wantIndex),
    };
  },
});

/**
 * Upsert swapper + sync swapper_wants for the current user and course.
 */
export const setRequest = mutation({
  args: {
    courseId: v.id("courses"),
    haveIndex: v.string(),
    wantIndexes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    if (args.wantIndexes.length > 16) {
      throw new ConvexError("At most 16 wanted indexes are allowed.");
    }

    const me = BigInt(identity.subject);

    const course = await ctx.db.get(args.courseId);
    if (!course) {
      throw new ConvexError("Course not found.");
    }

    const courseId = course._id;

    const mySwappers = await ctx.db
      .query("swapper")
      .withIndex("by_telegramUserId", (q) => q.eq("telegramUserId", me))
      .collect();
    const existingSwapper = mySwappers.find((s) => s.courseId === courseId);

    let mySwapperId = existingSwapper?._id;
    if (existingSwapper) {
      await ctx.db.patch(existingSwapper._id, { index: args.haveIndex });
    } else {
      mySwapperId = await ctx.db.insert("swapper", {
        telegramUserId: me,
        courseId,
        index: args.haveIndex,
        hasSwapped: false,
      });
    }
    if (!mySwapperId) {
      throw new ConvexError("Swapper not found.");
    }

    const myWants = await ctx.db
      .query("swapper_wants")
      .withIndex("by_swapperId", (q) => q.eq("swapperId", mySwapperId))
      .collect();
    const wantsForCourse = myWants;

    const wantSet = new Set(args.wantIndexes);
    const toRemove = wantsForCourse.filter((w) => !wantSet.has(w.wantIndex));
    const currentWantStrings = new Set(wantsForCourse.map((w) => w.wantIndex));
    const toAdd = args.wantIndexes.filter(
      (idx) => !currentWantStrings.has(idx)
    );

    const now = Date.now();
    for (const row of toRemove) {
      await ctx.db.delete(row._id);
    }
    for (const wantIndex of toAdd) {
      await ctx.db.insert("swapper_wants", {
        swapperId: mySwapperId,
        wantIndex,
        requestedAt: now,
      });
    }

    return {
      success: true as const,
      courseCode: course.code,
    };
  },
});

export const getCourseRequestAndMatches = query({
  args: {
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    const me = BigInt(identity.subject);
    const courseId = args.courseId;

    const course = await ctx.db.get(courseId);
    if (!course) {
      throw new ConvexError("Course not found.");
    }

    const allSwappers = await ctx.db
      .query("swapper")
      .withIndex("by_courseId", (q) => q.eq("courseId", courseId))
      .collect();
    const mySwapper = allSwappers.find((s) => s.telegramUserId === me);

    if (!mySwapper) {
      return {
        course: {
          id: courseId,
          code: course.code,
          name: course.name,
        },
        wantIndexes: [],
        matches: [],
      };
    }

    const haveIndex = mySwapper.index;

    const allSwapperWants = await ctx.db
      .query("swapper_wants")
      .filter((q) =>
        q.or(...allSwappers.map((s) => q.eq(q.field("swapperId"), s._id)))
      )
      .collect();

    const wantIndexesSet = new Set(allSwapperWants.map((w) => w.wantIndex));

    const allMyRequests = await ctx.db
      .query("swap_requests")
      .filter((q) =>
        q.or(
          q.eq(q.field("swapper1"), mySwapper._id),
          q.eq(q.field("swapper2"), mySwapper._id)
        )
      )
      .collect();

    console.log("allMyRequests", allMyRequests);
    console.log("allSwappers", allSwappers);
    console.log("allSwapperWants", allSwapperWants);
    console.log("wantIndexesSet", wantIndexesSet);
    console.log("haveIndex", haveIndex);
    console.log("mySwapper", mySwapper);

    const matches: ({
      otherSwapperId: Id<"swapper">;
      isPerfectMatch: boolean;
      index: string;
    } & (
      | {
          status: undefined;
        }
      | {
          status: "cancelled";
          isSelfInitiated: boolean;
          requestedAt: number;
        }
      | {
          status: "pending";
          isSelfInitiated: boolean;
          requestedAt: number;
        }
      | {
          status: "swapped";
          isSelfInitiated: boolean;
        }
    ))[] = [];

    for (const otherSwapper of allSwappers) {
      // if (otherSwapper.telegramUserId === me) continue;

      // First check if this is a potential match. A potential match
      // is one where the other swapper's index is in my want indexes.
      const isPotentialMatch = wantIndexesSet.has(otherSwapper.index);
      // If not a potential match, continue.
      if (!isPotentialMatch) {
        console.log("A");
        continue;
      }

      // Check if this is a perfect match. A perfect match is one where the other swapper's index is in my want indexes and my index is in their want indexes.
      let isPerfectMatchWithOther = false;
      console.log("B");
      if (isPotentialMatch) {
        const otherWants = allSwapperWants.filter(
          (w) => w.swapperId === otherSwapper._id
        );
        isPerfectMatchWithOther = otherWants.some(
          (w) => w.wantIndex === haveIndex
        );
      }

      // Now we check the availability of the match.
      const isAvailable = !mySwapper.hasSwapped && !otherSwapper.hasSwapped;
      const myMatchRequestWithOther = allMyRequests.find(
        (r) =>
          r.swapper1 === otherSwapper._id || r.swapper2 === otherSwapper._id
      );
      // We show IF there was previously a request for this match, but not if the match is available.
      if (!isAvailable && myMatchRequestWithOther === undefined) {
        console.log("C");
        continue;
      }
      console.log("D");

      // Finally, we deducce the status of the match.
      const isSelfInitiated =
        myMatchRequestWithOther?.initiator === mySwapper._id;
      console.log("E");
      if (isAvailable) {
        if (myMatchRequestWithOther) {
          matches.push({
            otherSwapperId: otherSwapper._id,
            isPerfectMatch: isPerfectMatchWithOther,
            index: otherSwapper.index,
            status: "pending",
            isSelfInitiated,
            requestedAt: myMatchRequestWithOther._creationTime,
          });
        } else {
          matches.push({
            otherSwapperId: otherSwapper._id,
            isPerfectMatch: isPerfectMatchWithOther,
            index: otherSwapper.index,
            status: undefined,
          });
        }
      }
      // No longer available.
      else {
        if (myMatchRequestWithOther) {
          if (otherSwapper.previouslyMatchedWith === mySwapper._id) {
            matches.push({
              otherSwapperId: otherSwapper._id,
              isPerfectMatch: isPerfectMatchWithOther,
              index: otherSwapper.index,
              status: "swapped",
              isSelfInitiated,
            });
          } else {
            matches.push({
              otherSwapperId: otherSwapper._id,
              isPerfectMatch: isPerfectMatchWithOther,
              index: otherSwapper.index,
              status: "cancelled",
              isSelfInitiated,
              requestedAt: myMatchRequestWithOther._creationTime,
            });
          }
        } else {
          // This should not happen.
          console.error(
            "Unhandled state where the request is no longer available but myMatchRequestWithOther is defined."
          );
        }
      }
    }

    // Sort matches by:
    // 1. By state: Swapped -> Pending -> undefined -> Cancelled
    // 2. In case of same state, by perfect match first, then requestedAt (newest first)
    const statusPriority = {
      swapped: 0,
      pending: 1,
      undefined: 2,
      cancelled: 3,
    } as const;
    matches.sort((a, b) => {
      const aState =
        a.status === undefined
          ? statusPriority.undefined
          : statusPriority[a.status];
      const bState =
        b.status === undefined
          ? statusPriority.undefined
          : statusPriority[b.status];
      if (aState !== bState) return aState - bState;

      if (a.isPerfectMatch !== b.isPerfectMatch) {
        return a.isPerfectMatch ? -1 : 1;
      }

      const aRequestedAt =
        "requestedAt" in a && typeof a.requestedAt === "number"
          ? a.requestedAt
          : 0;
      const bRequestedAt =
        "requestedAt" in b && typeof b.requestedAt === "number"
          ? b.requestedAt
          : 0;
      return bRequestedAt - aRequestedAt;
    });

    return {
      course: {
        id: courseId,
        haveIndex,
        hasSwapped: mySwapper.hasSwapped,
      },
      wantIndexes: Array.from(wantIndexesSet),
      matches,
    };
  },
});

export const toggleSwapRequest = mutation({
  args: {
    courseId: v.id("courses"),
    hasSwapped: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthorized");

    const me = BigInt(identity.subject);
    const mySwappers = await ctx.db
      .query("swapper")
      .withIndex("by_telegramUserId", (q) => q.eq("telegramUserId", me))
      .collect();
    const mySwapper = mySwappers.find((s) => s.courseId === args.courseId);
    if (!mySwapper) throw new ConvexError("Swap request not found.");

    await ctx.db.patch(mySwapper._id, { hasSwapped: args.hasSwapped });
    return { success: true as const, toggledTo: args.hasSwapped };
  },
});

export const requestSwap = internalMutation({
  args: {
    courseId: v.id("courses"),
    otherSwapperId: v.id("swapper"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthorized");

    const meId = BigInt(identity.subject);

    const course = await ctx.db.get(args.courseId);
    if (!course) {
      throw new ConvexError("Course not found.");
    }

    const otherSwapper = await ctx.db.get(args.otherSwapperId);
    if (!otherSwapper || otherSwapper.courseId !== args.courseId) {
      throw new ConvexError("Swap request not found.");
    }
    // if (otherSwapper.telegramUserId === meId) {
    //   throw new ConvexError("Cannot request a swap with yourself.");
    // }
    if (otherSwapper.hasSwapped) {
      throw new ConvexError("The swapper is no longer looking to swap.");
    }

    const otherUser = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) =>
        q.eq("userId", otherSwapper.telegramUserId)
      )
      .unique();
    if (!otherUser) {
      throw new ConvexError("User not found.");
    }

    const meUser = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", meId))
      .unique();
    if (!meUser) {
      throw new ConvexError("User not found.");
    }

    const meSwapper = await ctx.db
      .query("swapper")
      .withIndex("by_telegramUserId_courseId", (q) =>
        q.eq("telegramUserId", meId).eq("courseId", args.courseId)
      )
      .unique();
    if (!meSwapper) {
      throw new ConvexError(
        "You have not set your index, please set one under your Telegram settings."
      );
    }

    const swapper1 =
      meId > otherSwapper.telegramUserId ? meSwapper._id : otherSwapper._id;
    const swapper2 =
      meId > otherSwapper.telegramUserId ? otherSwapper._id : meSwapper._id;

    const existing = await ctx.db
      .query("swap_requests")
      .withIndex("by_course_swapper_pair", (q) =>
        q
          .eq("courseId", args.courseId)
          .eq("swapper1", swapper1)
          .eq("swapper2", swapper2)
      )
      .unique();

    if (existing) {
      throw new ConvexError(
        "You have already requested a swap for this course."
      );
    }

    await ctx.db.insert("swap_requests", {
      courseId: args.courseId,
      swapper1,
      swapper2,
      initiator: meSwapper._id,
      requestedAt: Date.now(),
    });

    const acceptPayloadId = await ctx.db.insert("telegram_callback_data", {
      callbackData: serializeAccept(
        course._id,
        meSwapper._id,
        otherSwapper._id
      ),
    });
    const alreadySwappedPayloadId = await ctx.db.insert(
      "telegram_callback_data",
      {
        callbackData: serializeAlreadySwapped(
          course._id,
          meSwapper._id,
          otherSwapper._id
        ),
      }
    );

    return {
      course: {
        id: course._id,
        code: course.code,
        name: course.name,
        ay: course.ay,
        semester: course.semester,
      },
      me: {
        id: meSwapper._id,
        telegramUserId: meId,
        handle: meUser.handle,
        index: meSwapper.index,
      },
      other: {
        id: otherSwapper._id,
        telegramUserId: otherSwapper.telegramUserId,
        handle: otherUser.handle,
        index: otherSwapper.index,
      },
      webhook: {
        accept: acceptPayloadId,
        already_swapped: alreadySwappedPayloadId,
      },
    };
  },
});

export const handleSwapRequestCallback = internalMutation({
  args: {
    courseId: v.id("courses"),
    otherSwapperId: v.id("swapper"),
    action: v.union(v.literal("accept"), v.literal("already_swapped")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthorized");

    const me = BigInt(identity.subject);
    const otherSwapper = await ctx.db.get(args.otherSwapperId);
    if (!otherSwapper || otherSwapper.courseId !== args.courseId) {
      throw new ConvexError("Swap request not found.");
    }

    const mySwappers = await ctx.db
      .query("swapper")
      .withIndex("by_telegramUserId", (q) => q.eq("telegramUserId", me))
      .collect();
    const mySwapper = mySwappers.find((s) => s.courseId === args.courseId);
    if (!mySwapper) throw new ConvexError("Swap request not found.");

    if (args.action === "accept") {
      await Promise.all([
        ctx.db.patch(mySwapper._id, { hasSwapped: true }),
        ctx.db.patch(otherSwapper._id, { hasSwapped: true }),
      ]);
    } else if (args.action === "already_swapped") {
      await ctx.db.patch(mySwapper._id, { hasSwapped: true });
    }

    // // Best-effort telegram messages.
    // try {
    //   await (ctx as any).runAction(sendSwapCallbackTelegram, {
    //     courseId: args.courseId,
    //     otherSwapperId: args.otherSwapperId,
    //     action: args.action,
    //   });
    // } catch {
    //   // ignore
    // }

    return { success: true as const };
  },
});

export const handleSwapRequestWebhookCallback = internalMutation({
  args: {
    payloadId: v.id("telegram_callback_data"),
    fromTelegramUserId: v.int64(),
  },
  handler: async (ctx, args) => {
    const payload = await ctx.db.get(args.payloadId);
    if (!payload) {
      throw new ConvexError("Callback payload not found.");
    }
    const actionInfo = getAction(payload.callbackData);
    if (!actionInfo) {
      throw new ConvexError("Invalid callback data.");
    }
    if (
      actionInfo.action !== COMMAND_PREFIX.ACCEPT &&
      actionInfo.action !== COMMAND_PREFIX.ALREADY_SWAPPED
    ) {
      throw new ConvexError("Invalid callback action.");
    }
    const parsed =
      actionInfo.action === COMMAND_PREFIX.ACCEPT
        ? deserializeAccept(payload.callbackData)
        : deserializeAlreadySwapped(payload.callbackData);
    if (!parsed) {
      throw new ConvexError("Invalid callback payload.");
    }
    const parsedCourseId = parsed.courseId as Id<"courses">;
    const parsedSwapper1Id = parsed.swapper1 as Id<"swapper">;
    const parsedSwapper2Id = parsed.swapper2 as Id<"swapper">;

    const swapper1 = await ctx.db.get(parsedSwapper1Id);
    const swapper2 = await ctx.db.get(parsedSwapper2Id);
    if (!swapper1 || !swapper2) {
      throw new ConvexError("Swapper not found.");
    }
    if (
      swapper1.courseId !== parsedCourseId ||
      swapper2.courseId !== parsedCourseId
    ) {
      throw new ConvexError("Invalid callback payload.");
    }

    const fromTelegramUserId = args.fromTelegramUserId;
    const isFromSwapper1 = fromTelegramUserId === swapper1.telegramUserId;
    const isFromSwapper2 = fromTelegramUserId === swapper2.telegramUserId;
    if (!isFromSwapper1 && !isFromSwapper2) {
      throw new ConvexError("Not a participant in this swap request");
    }

    const thisTelegramUserId = fromTelegramUserId;
    const otherTelegramUserId = isFromSwapper1
      ? swapper2.telegramUserId
      : swapper1.telegramUserId;

    const canonicalSwapper1 =
      swapper1.telegramUserId > swapper2.telegramUserId
        ? swapper1._id
        : swapper2._id;
    const canonicalSwapper2 =
      swapper1.telegramUserId > swapper2.telegramUserId
        ? swapper2._id
        : swapper1._id;
    const request = await ctx.db
      .query("swap_requests")
      .withIndex("by_course_swapper_pair", (q) =>
        q
          .eq("courseId", parsedCourseId)
          .eq("swapper1", canonicalSwapper1)
          .eq("swapper2", canonicalSwapper2)
      )
      .unique();
    if (!request) {
      throw new ConvexError("Swap request not found.");
    }

    const thisSwapper = isFromSwapper1 ? swapper1 : swapper2;
    const otherSwapper = isFromSwapper1 ? swapper2 : swapper1;

    const course = await ctx.db.get(parsedCourseId);
    if (!course) {
      throw new ConvexError("Course not found");
    }

    const action =
      actionInfo.action === COMMAND_PREFIX.ACCEPT
        ? "accept"
        : "already_swapped";

    if (action === "accept") {
      await Promise.all([
        ctx.db.patch(thisSwapper._id, {
          hasSwapped: true,
          previouslyMatchedWith: otherSwapper._id,
        }),
        ctx.db.patch(otherSwapper._id, {
          hasSwapped: true,
          previouslyMatchedWith: thisSwapper._id,
        }),
      ]);
    } else {
      await ctx.db.patch(thisSwapper._id, { hasSwapped: true });
    }

    return {
      action,
      courseCode: course.code,
      courseName: course.name,
      thisTelegramUserId: Number(thisSwapper.telegramUserId),
      otherTelegramUserId: Number(otherSwapper.telegramUserId),
    };
  },
});

export const onboard = mutation({
  args: {
    school: schoolValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    const username = identity.nickname;
    if (!username) {
      throw new ConvexError("Your telegram username is not set.");
    }

    const telegramUserId = BigInt(identity.subject);

    const existing = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", telegramUserId))
      .unique();
    if (existing) {
      return {
        success: true,
        user: existing,
      };
    }

    const userId = await ctx.db.insert("users", {
      userId: telegramUserId,
      handle: username,
      school: args.school,
    });

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new ConvexError("Failed to onboard user.");
    }

    return {
      success: true,
      user,
    };
  },
});
