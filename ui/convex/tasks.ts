import { CurrentAcadYear } from "@/lib/acad";
import { schools } from "@/lib/types";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  COMMAND_PREFIX,
  deserializeAccept,
  deserializeDecline,
  getAction,
  serializeAccept,
  serializeDecline,
} from "@/telegram/callbacks";
import { getAccountSetupFromUser, getAuth, getIdentity } from "./utils";
import { env } from "@/lib/env-convex";
import { isAllowedUsername } from "@/lib/user";

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
    try {
      const auth = await getAuth(ctx, false);
      return {
        ...auth.user,
        accountSetup: auth.accountSetup,
      };
    } catch (error) {
      return null;
    }
  },
});

export const getAccountSetup = query({
  args: {
    email: v.string(),
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.apiKey !== env.API_KEY) {
      throw new ConvexError("Invalid API key");
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
    if (!user) {
      return {
        type: "not_setup" as const,
      };
    }
    return {
      type: getAccountSetupFromUser(user),
      username: user.username,
    };
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
    const { user } = await getAuth(ctx);

    const allMySwappers = await ctx.db
      .query("swapper")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
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
                // return q.or(
                //   q.eq(q.field("targetSwapper"), request._id),
                //   q.eq(q.field("initiator"), request._id),
                //   q.eq(q.field("middlemanSwapper"), request._id)
                // );
                return q.and(
                  q.or(
                    q.eq(q.field("targetSwapper"), request._id),
                    q.eq(q.field("initiator"), request._id),
                    q.eq(q.field("middlemanSwapper"), request._id)
                  ),
                  q.eq(q.field("isCompleted"), false)
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
          const initiator = swapperMap.get(request.initiator);
          const target = swapperMap.get(request.targetSwapper);
          if (!initiator || !target) continue;

          if (request.middlemanSwapper) {
            const middleman = swapperMap.get(request.middlemanSwapper);
            if (!middleman) continue;
          }

          if (initiator.hasSwapped || target.hasSwapped) continue;

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
        const potentialMatches = [];
        for (const otherSwapper of allSwappersInCourse) {
          if (otherSwapper.hasSwapped) continue;
          if (otherSwapper.userId === user._id) continue;
          if (myWantsAsSet.has(otherSwapper.index)) {
            // The other swapper has the index I want and I have the index they want.
            // If not, we mark it as a potential match.
            if (otherSwapper.index !== request.index) {
              potentialMatches.push(otherSwapper._id);
              continue;
            }
            matchCount += 1;
          }
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
    acadYear: acadYearValidator,
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
      throw new ConvexError("Course not found.");
    }
    const courseId = course._id;
    const courseIndexes = await ctx.db
      .query("course_index")
      .withIndex("by_courseId", (q) => q.eq("courseId", courseId))
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

    return {
      course: {
        id: courseId,
        code: course.code,
        name: course.name,
      },
      indexes: courseIndexes.map((r) => ({
        id: r._id,
        index: r.index,
        haveCount: haveCountByIndex.get(r.index) ?? 0,
        wantCount: wantCountByIndex.get(r.index) ?? 0,
      })),
    };
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
    const { user } = await getAuth(ctx);

    const courseId = args.courseId;

    const meSwapper = await ctx.db
      .query("swapper")
      .withIndex("by_userId_courseId", (q) =>
        q.eq("userId", user._id).eq("courseId", courseId)
      )
      .unique();
    if (!meSwapper) {
      return {
        haveIndex: undefined,
        wantIndexes: [],
      };
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
    if (args.wantIndexes.length > 16) {
      throw new ConvexError("At most 16 wanted indexes are allowed.");
    }

    const { user } = await getAuth(ctx);
    const course = await ctx.db.get(args.courseId);
    if (!course) {
      throw new ConvexError("Course not found.");
    }

    const courseId = course._id;

    const mySwappers = await ctx.db
      .query("swapper")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    const existingSwapper = mySwappers.find((s) => s.courseId === courseId);

    let mySwapperId = existingSwapper?._id;
    if (existingSwapper) {
      await ctx.db.patch(existingSwapper._id, { index: args.haveIndex });
    } else {
      mySwapperId = await ctx.db.insert("swapper", {
        userId: user._id,
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

export const getHasSwapped = query({
  args: {
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuth(ctx);
    const mySwapper = await ctx.db
      .query("swapper")
      .withIndex("by_userId_courseId", (q) =>
        q.eq("userId", user._id).eq("courseId", args.courseId)
      )
      .first();
    if (!mySwapper) {
      return false;
    }
    return mySwapper.hasSwapped;
  },
});

export const getCourseRequestAndMatches = query({
  args: {
    // courseId: v.id("courses"),
    courseCode: v.string(),
    acadYear: v.optional(acadYearValidator),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuth(ctx);

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
      throw new ConvexError("Course not found.");
    }
    const courseId = course._id;

    const allSwappers = await ctx.db
      .query("swapper")
      .withIndex("by_courseId", (q) => q.eq("courseId", courseId))
      .collect();
    const mySwapper = allSwappers.find((s) => s.userId === user._id);

    if (!mySwapper) {
      return {
        course: {
          id: courseId,
          code: course.code,
          name: course.name,
        },
        wantIndexes: [],
        directMatches: [],
        threeWayCycleMatches: [],
      };
    }

    const haveIndex = mySwapper.index;

    const userIds = Array.from(new Set(allSwappers.map((s) => s.userId)));

    const [allSwapperWants, users] = await Promise.all([
      ctx.db
        .query("swapper_wants")
        .filter((q) =>
          q.or(...allSwappers.map((s) => q.eq(q.field("swapperId"), s._id)))
        )
        .collect(),
      ctx.db
        .query("users")
        .filter((q) => q.or(...userIds.map((id) => q.eq(q.field("_id"), id))))
        .collect(),
    ]);
    const userMap = new Map(users.map((u) => [u._id, u]));

    const wantIndexesSet = new Set(
      allSwapperWants
        .filter((w) => w.swapperId === mySwapper._id)
        .map((w) => w.wantIndex)
    );

    const allMyRequests = await ctx.db
      .query("swap_requests")
      .filter((q) =>
        q.and(
          q.or(
            q.eq(q.field("initiator"), mySwapper._id),
            q.eq(q.field("targetSwapper"), mySwapper._id),
            q.eq(q.field("middlemanSwapper"), mySwapper._id)
          ),
          q.eq(q.field("courseId"), courseId),
          q.eq(q.field("isCompleted"), false)
        )
      )
      .collect();

    type BaseMatch = {
      status?: "pending" | "accepted" | "declined";
      initiator: {
        id: Id<"swapper">;
        username: string;
        index: string;
        hasAccepted: boolean;
      };
      target: {
        id: Id<"swapper">;
        username: string;
        index: string;
        hasAccepted: boolean;
      };
    };
    const directMatches: (BaseMatch & {
      isPerfectMatch: boolean;
      iHaveWhatTheyWant: boolean;
      theyHaveWhatIWant: boolean;
      iam: "initiator" | "target";
    })[] = [];
    const threeWayCycleMatches: (BaseMatch & {
      middleman: {
        id: Id<"swapper">;
        username: string;
        index: string;
        hasAccepted: boolean;
      };
      iam: "initiator" | "target" | "middleman";
    })[] = [];

    const swapperById = new Map(
      allSwappers.map((swapper) => [swapper._id, swapper])
    );
    const wantsBySwapperId = new Map<Id<"swapper">, Set<string>>();
    for (const want of allSwapperWants) {
      const wants = wantsBySwapperId.get(want.swapperId) ?? new Set<string>();
      wants.add(want.wantIndex);
      wantsBySwapperId.set(want.swapperId, wants);
    }

    // Direct matches.
    for (const otherSwapper of allSwappers) {
      const otherUser = userMap.get(otherSwapper.userId);
      if (!otherUser) continue;
      // TAG: Personal check
      if (otherSwapper.userId === user._id) continue;

      // First check if this is a potential match. A potential match
      // is one where the other swapper's index is in my want indexes.
      const haveWhatIWant = wantIndexesSet.has(otherSwapper.index);

      // Check if this is a perfect match. A perfect match is one where the other swapper's index is in my want indexes and my index is in their want indexes.
      const otherWants = wantsBySwapperId.get(otherSwapper._id);
      if (!otherWants) continue;
      const haveWhatTheyWant = otherWants.has(haveIndex);
      const isPerfectMatchWithOther = haveWhatTheyWant && haveWhatIWant;

      // Now we check the availability of the match.
      const isAvailable = !mySwapper.hasSwapped && !otherSwapper.hasSwapped;
      const myMatchRequestWithOther = allMyRequests.find(
        (r) =>
          (r.initiator === otherSwapper._id ||
            r.targetSwapper === otherSwapper._id) &&
          // We will deal with 3 way swaps later.
          r.middlemanSwapper === undefined
      );
      // If not a potential match AND there is no request for this match, continue.
      if (!haveWhatIWant && myMatchRequestWithOther === undefined) {
        continue;
      }
      // We show IF there was previously a request for this match, but not if the match is available.
      if (!isAvailable && myMatchRequestWithOther === undefined) {
        continue;
      }

      // Finally, we deducce the status of the match.
      const isSelfInitiated =
        myMatchRequestWithOther === undefined ||
        myMatchRequestWithOther.initiator === mySwapper._id;
      let initiator, target;
      // let initiatorWantsTarget = false;
      // let targetWantsInitiator = false;
      if (isSelfInitiated) {
        // initiatorWantsTarget = haveWhatIWant;
        // targetWantsInitiator = haveWhatTheyWant;
        initiator = {
          id: mySwapper._id,
          username: user.username,
          index: mySwapper.index,
          hasAccepted: myMatchRequestWithOther?.acceptedByInitiator ?? false,
        };
        target = {
          id: otherSwapper._id,
          username: otherUser.username,
          index: otherSwapper.index,
          hasAccepted:
            myMatchRequestWithOther?.acceptedByTargetSwapper ?? false,
        };
      } else {
        // initiatorWantsTarget = haveWhatTheyWant;
        // targetWantsInitiator = haveWhatIWant;
        initiator = {
          id: otherSwapper._id,
          username: otherUser.username,
          index: otherSwapper.index,
          hasAccepted: myMatchRequestWithOther?.acceptedByInitiator ?? false,
        };
        target = {
          id: mySwapper._id,
          username: user.username,
          index: mySwapper.index,
          hasAccepted:
            myMatchRequestWithOther?.acceptedByTargetSwapper ?? false,
        };
      }

      if (isAvailable) {
        if (myMatchRequestWithOther) {
          directMatches.push({
            initiator,
            target,
            isPerfectMatch: isPerfectMatchWithOther,
            iHaveWhatTheyWant: haveWhatTheyWant,
            theyHaveWhatIWant: haveWhatIWant,
            status: "pending",
            iam: isSelfInitiated ? "initiator" : "target",
            // requestedAt: myMatchRequestWithOther._creationTime,
          });
        } else {
          directMatches.push({
            initiator,
            target,
            isPerfectMatch: isPerfectMatchWithOther,
            iHaveWhatTheyWant: haveWhatTheyWant,
            theyHaveWhatIWant: haveWhatIWant,
            status: undefined,
            iam: isSelfInitiated ? "initiator" : "target",
          });
        }
      }
      // No longer available.
      else {
        if (myMatchRequestWithOther) {
          directMatches.push({
            initiator,
            target,
            isPerfectMatch: isPerfectMatchWithOther,
            iHaveWhatTheyWant: haveWhatTheyWant,
            theyHaveWhatIWant: haveWhatIWant,
            status:
              myMatchRequestWithOther.isCompleted &&
              myMatchRequestWithOther.acceptedByInitiator &&
              myMatchRequestWithOther.acceptedByTargetSwapper &&
              (myMatchRequestWithOther.acceptedByMiddlemanSwapper ||
                myMatchRequestWithOther.middlemanSwapper === undefined)
                ? ("accepted" as const)
                : ("declined" as const),
            iam: isSelfInitiated ? "initiator" : "target",
          });
        } else {
          // This should not happen.
          console.error(
            "Unhandled state where the request is no longer available but myMatchRequestWithOther is defined."
          );
        }
      }
    }

    // Three-way cycle matches.
    const threeWayConsideredMatches = directMatches.filter(
      (m) => m.theyHaveWhatIWant
    );
    // Find a middleman who wants what you have
    // and has an index that can be given to
    // someone else who has what you want.

    for (const mainTargetSwapper of threeWayConsideredMatches) {
      const otherSwapper = swapperById.get(mainTargetSwapper.target.id);
      if (!otherSwapper) continue;

      const otherUser = userMap.get(otherSwapper.userId);
      if (!otherUser) continue;

      const otherWants = wantsBySwapperId.get(otherSwapper._id);
      if (!otherWants || otherWants.size === 0) continue;

      // Find the middleman.
      for (const _middleman of allSwappers) {
        if (_middleman._id === mySwapper._id) continue;
        if (_middleman._id === otherSwapper._id) continue;

        const middlemanUser = userMap.get(_middleman.userId);
        if (!middlemanUser) continue;

        const middlemanWants = wantsBySwapperId.get(_middleman._id);
        if (!middlemanWants?.has(haveIndex)) continue;
        if (!otherWants.has(_middleman.index)) continue;

        const canonicalId = [
          mySwapper._id,
          otherSwapper._id,
          _middleman._id,
        ].sort();
        const myMatchRequestWithBothOthers = allMyRequests.find((r) => {
          const requestCanonicalId = [
            r.initiator,
            r.targetSwapper,
            r.middlemanSwapper,
          ].sort();
          return requestCanonicalId.every(
            (id, index) => id === canonicalId[index]
          );
        });
        const isAvailable =
          !mySwapper.hasSwapped &&
          !otherSwapper.hasSwapped &&
          !_middleman.hasSwapped;
        if (!myMatchRequestWithBothOthers && !isAvailable) continue;

        // Deduce the status of the match.
        // const isSelfInitiated =
        //   myMatchRequestWithBothOthers === undefined ||
        //   myMatchRequestWithBothOthers.initiator === mySwapper._id;

        let iam: "initiator" | "target" | "middleman" = "initiator";
        if (
          myMatchRequestWithBothOthers === undefined ||
          myMatchRequestWithBothOthers.initiator === mySwapper._id
        ) {
          iam = "initiator";
        } else if (
          myMatchRequestWithBothOthers.targetSwapper === mySwapper._id
        ) {
          iam = "target";
        } else if (
          myMatchRequestWithBothOthers.middlemanSwapper === mySwapper._id
        ) {
          iam = "middleman";
        }

        let initiator, middleman, target;
        if (myMatchRequestWithBothOthers) {
          if (myMatchRequestWithBothOthers.middlemanSwapper === undefined) {
            throw new ConvexError("Middleman swapper not found.");
          }
          const initiatorSwapper = swapperById.get(
            myMatchRequestWithBothOthers.initiator
          );
          const middlemanSwapper = swapperById.get(
            myMatchRequestWithBothOthers.middlemanSwapper
          );
          const targetSwapper = swapperById.get(
            myMatchRequestWithBothOthers.targetSwapper
          );

          if (!initiatorSwapper || !middlemanSwapper || !targetSwapper) {
            console.warn(
              `Swapper not found while trying to pair existing matches: ${initiatorSwapper}, ${middlemanSwapper}, ${targetSwapper}`
            );
            continue;
          }

          const initiatorUsername = userMap.get(
            initiatorSwapper.userId
          )?.username;
          const middlemanUsername = userMap.get(
            middlemanSwapper.userId
          )?.username;
          const targetUsername = userMap.get(targetSwapper.userId)?.username;
          if (!initiatorUsername || !middlemanUsername || !targetUsername) {
            console.warn(
              `Username not found while trying to pair existing matches: ${initiatorUsername}, ${middlemanUsername}, ${targetUsername}`
            );
            continue;
          }
          initiator = {
            id: myMatchRequestWithBothOthers.initiator,
            username: initiatorUsername,
            index: initiatorSwapper.index,
            hasAccepted:
              myMatchRequestWithBothOthers?.acceptedByInitiator ?? false,
          };
          middleman = {
            id: myMatchRequestWithBothOthers.middlemanSwapper,
            username: middlemanUsername,
            index: middlemanSwapper.index,
            hasAccepted:
              myMatchRequestWithBothOthers?.acceptedByMiddlemanSwapper ?? false,
          };
          target = {
            id: myMatchRequestWithBothOthers.targetSwapper,
            username: targetUsername,
            index: targetSwapper.index,
            hasAccepted:
              myMatchRequestWithBothOthers?.acceptedByTargetSwapper ?? false,
          };
        } else {
          const initiatorSwapper = mySwapper;
          const middlemanSwapper = _middleman;
          const targetSwapper = otherSwapper;

          const initiatorUsername = user.username;
          const middlemanUsername = middlemanUser.username;
          const targetUsername = otherUser.username;
          initiator = {
            id: initiatorSwapper._id,
            username: initiatorUsername,
            index: initiatorSwapper.index,
            hasAccepted: false,
          };
          middleman = {
            id: middlemanSwapper._id,
            username: middlemanUsername,
            index: middlemanSwapper.index,
            hasAccepted: false,
          };
          target = {
            id: targetSwapper._id,
            username: targetUsername,
            index: targetSwapper.index,
            hasAccepted: false,
          };
        }

        if (isAvailable) {
          if (myMatchRequestWithBothOthers) {
            threeWayCycleMatches.push({
              initiator,
              target,
              middleman,
              status: "pending",
              iam,
            });
          } else {
            threeWayCycleMatches.push({
              initiator,
              target,
              middleman,
              status: undefined,
              iam,
            });
          }
        } else {
          if (myMatchRequestWithBothOthers) {
            threeWayCycleMatches.push({
              initiator,
              target,
              middleman,
              status:
                myMatchRequestWithBothOthers.isCompleted &&
                myMatchRequestWithBothOthers.acceptedByInitiator &&
                myMatchRequestWithBothOthers.acceptedByTargetSwapper &&
                (myMatchRequestWithBothOthers.acceptedByMiddlemanSwapper ||
                  myMatchRequestWithBothOthers.middlemanSwapper === undefined)
                  ? ("accepted" as const)
                  : ("declined" as const),
              iam,
            });
          } else {
            // This should not happen.
            console.error(
              "Unhandled state where the request is no longer available but myMatchRequestWithBothOthers is defined."
            );
          }
        }
        // threeWayCycleMatches.push({
        //   ...match,
        //   middlemanSwapperId: middleman._id,
        //   middlemanIndex: middleman.index,
        // });
      }
    }

    // Sort matches by:
    // 1. By state: Pending -> undefined -> Accepted -> Declined
    // 2. In case of same state, by perfect match first, then requestedAt (newest first)
    const statusPriority = {
      pending: 1,
      undefined: 2,
      accepted: 3,
      declined: 4,
    } as const;
    directMatches.sort((a, b) => {
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
        name: course.name,
        hasSwapped: mySwapper.hasSwapped,
        haveIndex: mySwapper.index,
      },
      wantIndexes: Array.from(wantIndexesSet),
      directMatches,
      threeWayCycleMatches,
    };
  },
});

export const getCourseRequestHistory = query({
  args: {
    courseCode: v.string(),
    acadYear: v.optional(acadYearValidator),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuth(ctx);
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
      throw new ConvexError("Course not found.");
    }

    const mySwapper = await ctx.db
      .query("swapper")
      .withIndex("by_userId_courseId", (q) =>
        q.eq("userId", user._id).eq("courseId", course._id)
      )
      .unique();
    if (!mySwapper) {
      return {
        course: {
          id: course._id,
          code: course.code,
          name: course.name,
        },
        history: [],
      };
    }

    const allRequests = await ctx.db
      .query("swap_requests")
      .withIndex("by_courseId", (q) => q.eq("courseId", course._id))
      .collect();

    const relevantRequests = allRequests.filter(
      (request) =>
        request.initiator === mySwapper._id ||
        request.targetSwapper === mySwapper._id ||
        request.middlemanSwapper === mySwapper._id
    );

    const now = Date.now();
    const historyRaw = relevantRequests.map((request) => {
      let status: "pending" | "accepted" | "cancelled" = "pending";
      if (request.isCompleted) {
        status =
          request.acceptedByInitiator &&
          request.acceptedByTargetSwapper &&
          (request.acceptedByMiddlemanSwapper ||
            request.middlemanSwapper === undefined)
            ? "accepted"
            : "cancelled";
      }
      const participants = [
        request.initiator,
        request.targetSwapper,
        request.middlemanSwapper,
      ].filter(
        (participant) =>
          participant !== mySwapper._id && participant !== undefined
      );
      return {
        id: request._id,
        participants,
        status,
        createdAt: request._creationTime,
        ageMs: Math.max(0, now - request._creationTime),
      };
    });

    const participantSwapperSet = new Set(
      historyRaw.flatMap((h) => h.participants) as Id<"swapper">[]
    );
    const participantSwapperList = Array.from(participantSwapperSet);
    const swappers = await ctx.db
      .query("swapper")
      .filter((q) =>
        q.and(
          q.or(...participantSwapperList.map((id) => q.eq(q.field("_id"), id))),
          q.eq(q.field("courseId"), course._id)
        )
      )
      .collect();
    const users = await ctx.db
      .query("users")
      .filter((q) =>
        q.or(...swappers.map((s) => q.eq(q.field("_id"), s.userId)))
      )
      .collect();
    const swapperUserMap = new Map(swappers.map((s) => [s._id, s.userId]));
    const userMap = new Map(users.map((u) => [u._id, u]));
    const history = historyRaw.map((h) => {
      const participants = h.participants
        .map((id) => {
          if (!id) return undefined;
          const userId = swapperUserMap.get(id);
          if (!userId) return undefined;
          const user = userMap.get(userId);
          if (!user) return undefined;
          return user.handle;
        })
        .filter((handle) => handle !== undefined);
      return {
        ...h,
        participants,
      };
    });
    // const history = await Promise.all(
    //   relevantRequests.map(async (request) => {
    //     const [initiatorSwapper, targetSwapper, middlemanSwapper] =
    //       await Promise.all([
    //         ctx.db.get(request.initiator),
    //         ctx.db.get(request.targetSwapper),
    //         request.middlemanSwapper
    //           ? ctx.db.get(request.middlemanSwapper)
    //           : Promise.resolve(null),
    //       ]);

    //     if (!initiatorSwapper || !targetSwapper) {
    //       throw new ConvexError("Invalid swap request participants.");
    //     }

    //     const [initiatorUser, targetUser, middlemanUser] = await Promise.all([
    //       ctx.db.get(initiatorSwapper.userId),
    //       ctx.db.get(targetSwapper.userId),
    //       middlemanSwapper
    //         ? ctx.db.get(middlemanSwapper.userId)
    //         : Promise.resolve(null),
    //     ]);
    //     if (!initiatorUser || !targetUser) {
    //       throw new ConvexError("Invalid swap request users.");
    //     }

    //     const participants = [initiatorUser, targetUser, middlemanUser]
    //       .filter((participant) => participant && participant._id !== user._id)
    //       .map((participant) => participant!.handle);

    //     const isAccepted = request.middlemanSwapper
    //       ? request.acceptedByInitiator &&
    //         request.acceptedByTargetSwapper &&
    //         request.acceptedByMiddlemanSwapper &&
    //         request.isCompleted
    //       : request.acceptedByInitiator &&
    //         request.acceptedByTargetSwapper &&
    //         request.isCompleted;

    //     const status = request.isCompleted
    //       ? isAccepted
    //         ? "accepted"
    //         : "cancelled"
    //       : "pending";

    //     return {
    //       id: request._id,
    //       participants,
    //       status: status as "pending" | "accepted" | "cancelled",
    //       createdAt: request._creationTime,
    //       ageMs: Math.max(0, now - request._creationTime),
    //     };
    //   })
    // );

    history.sort((a, b) => b.createdAt - a.createdAt);

    return {
      course: {
        id: course._id,
        code: course.code,
        name: course.name,
      },
      history,
    };
  },
});

export const getActiveSwapRequestCount = query({
  args: {
    courseCode: v.string(),
    acadYear: v.optional(acadYearValidator),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuth(ctx);
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
      throw new ConvexError("Course not found.");
    }

    const mySwapper = await ctx.db
      .query("swapper")
      .withIndex("by_userId_courseId", (q) =>
        q.eq("userId", user._id).eq("courseId", course._id)
      )
      .unique();
    if (!mySwapper) {
      return {
        activeRequestsCount: 0,
        hasSwapped: false,
      };
    }

    const activeRequests = await ctx.db
      .query("swap_requests")
      .withIndex("by_courseId", (q) => q.eq("courseId", course._id))
      .filter((q) =>
        q.and(
          q.or(
            q.eq(q.field("initiator"), mySwapper._id),
            q.eq(q.field("targetSwapper"), mySwapper._id),
            q.eq(q.field("middlemanSwapper"), mySwapper._id)
          ),
          q.eq(q.field("isCompleted"), false)
        )
      )
      .collect();

    return {
      activeRequestsCount: activeRequests.length,
      hasSwapped: mySwapper.hasSwapped,
    };
  },
});

export const toggleSwapRequest = internalMutation({
  args: {
    courseCode: v.string(),
    hasSwapped: v.boolean(),
    acadYear: v.optional(acadYearValidator),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuth(ctx);
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
      throw new ConvexError("Course not found.");
    }

    const mySwapper = await ctx.db
      .query("swapper")
      .withIndex("by_userId_courseId", (q) =>
        q.eq("userId", user._id).eq("courseId", course._id)
      )
      .unique();
    if (!mySwapper) throw new ConvexError("Swap request not found.");

    const cancelledRequests: Array<{
      isDirectSwap: boolean;
      iam: "initiator" | "targetSwapper" | "middlemanSwapper";
      course: { code: string; name: string };
      initiator: { handle: string; telegramUserId: bigint };
      targetSwapper: { handle: string; telegramUserId: bigint };
      middlemanSwapper: { handle: string; telegramUserId: bigint } | null;
    }> = [];

    if (args.hasSwapped) {
      const activeRequests = await ctx.db
        .query("swap_requests")
        .withIndex("by_courseId", (q) => q.eq("courseId", course._id))
        .filter((q) =>
          q.and(
            q.or(
              q.eq(q.field("initiator"), mySwapper._id),
              q.eq(q.field("targetSwapper"), mySwapper._id),
              q.eq(q.field("middlemanSwapper"), mySwapper._id)
            ),
            q.eq(q.field("isCompleted"), false)
          )
        )
        .collect();

      for (const request of activeRequests) {
        const [initiatorSwapper, targetSwapper, middlemanSwapper] =
          await Promise.all([
            ctx.db.get(request.initiator),
            ctx.db.get(request.targetSwapper),
            request.middlemanSwapper
              ? ctx.db.get(request.middlemanSwapper)
              : Promise.resolve(null),
          ]);
        if (!initiatorSwapper || !targetSwapper) continue;

        const [initiatorUser, targetUser, middlemanUser] = await Promise.all([
          ctx.db.get(initiatorSwapper.userId),
          ctx.db.get(targetSwapper.userId),
          middlemanSwapper
            ? ctx.db.get(middlemanSwapper.userId)
            : Promise.resolve(null),
        ]);
        if (!initiatorUser || !targetUser) continue;

        const iam: "initiator" | "targetSwapper" | "middlemanSwapper" =
          request.initiator === mySwapper._id
            ? "initiator"
            : request.targetSwapper === mySwapper._id
              ? "targetSwapper"
              : "middlemanSwapper";

        await ctx.db.patch(request._id, {
          isCompleted: true,
          acceptedByInitiator:
            iam === "initiator" ? false : request.acceptedByInitiator,
          acceptedByTargetSwapper:
            iam === "targetSwapper" ? false : request.acceptedByTargetSwapper,
          acceptedByMiddlemanSwapper:
            iam === "middlemanSwapper"
              ? false
              : request.acceptedByMiddlemanSwapper,
        });

        cancelledRequests.push({
          isDirectSwap: request.middlemanSwapper === undefined,
          iam,
          course: {
            code: course.code,
            name: course.name,
          },
          initiator: {
            handle: initiatorUser.handle,
            telegramUserId: initiatorUser.telegramUserId,
          },
          targetSwapper: {
            handle: targetUser.handle,
            telegramUserId: targetUser.telegramUserId,
          },
          middlemanSwapper:
            middlemanUser && middlemanSwapper
              ? {
                  handle: middlemanUser.handle,
                  telegramUserId: middlemanUser.telegramUserId,
                }
              : null,
        });
      }
    }

    await ctx.db.patch(mySwapper._id, { hasSwapped: args.hasSwapped });
    return {
      success: true as const,
      toggledTo: args.hasSwapped,
      cancelledRequests,
    };
  },
});

export const requestSwap = internalMutation({
  args: {
    // courseId: v.id("courses"),
    // otherSwapperId: v.id("swapper"),
    targetSwapperId: v.id("swapper"),
    middlemanSwapperId: v.optional(v.id("swapper")),
  },
  handler: async (ctx, args) => {
    const { user: meUser } = await getAuth(ctx);

    const targetSwapper = await ctx.db.get(args.targetSwapperId);
    if (!targetSwapper) {
      throw new ConvexError("Swap request not found.");
    }
    // TAG: Personal check
    if (targetSwapper.userId === meUser._id) {
      throw new ConvexError("Cannot request a swap with yourself.");
    }
    if (targetSwapper.hasSwapped) {
      throw new ConvexError("The swapper is no longer looking to swap.");
    }

    const course = await ctx.db.get(targetSwapper.courseId);
    if (!course) {
      throw new ConvexError("Course not found.");
    }

    let middlemanSwapper: typeof targetSwapper | null = null;
    let middlemanSwapperUser: typeof meUser | null = null;
    if (args.middlemanSwapperId) {
      middlemanSwapper = await ctx.db.get(args.middlemanSwapperId);
      if (!middlemanSwapper) {
        throw new ConvexError("Middleman swapper not found.");
      }
      if (middlemanSwapper.userId === meUser._id) {
        throw new ConvexError("Cannot request a swap with yourself.");
      }
      if (middlemanSwapper.hasSwapped) {
        throw new ConvexError(
          "The middleman swapper is no longer looking to swap."
        );
      }

      if (middlemanSwapper.courseId !== course._id) {
        throw new ConvexError(
          "The middleman swapper is not for the same course."
        );
      }

      middlemanSwapperUser = await ctx.db.get(middlemanSwapper.userId);
      if (!middlemanSwapperUser) {
        throw new ConvexError("User not found.");
      }
    }

    const targetUser = await ctx.db.get(targetSwapper.userId);
    if (!targetUser) {
      throw new ConvexError("User not found.");
    }

    const meSwapper = await ctx.db
      .query("swapper")
      .withIndex("by_userId_courseId", (q) =>
        q.eq("userId", meUser._id).eq("courseId", course._id)
      )
      .unique();
    // .unique();
    if (!meSwapper) {
      throw new ConvexError(
        "You have not set your index, please set one under your Telegram settings."
      );
    }

    const existingRequests = await ctx.db
      .query("swap_requests")
      .filter((q) => {
        if (middlemanSwapper) {
          return q.and(
            q.or(
              q.and(
                q.eq(q.field("initiator"), meSwapper._id),
                q.eq(q.field("targetSwapper"), targetSwapper._id),
                q.eq(q.field("middlemanSwapper"), middlemanSwapper._id)
              ),
              q.and(
                q.eq(q.field("initiator"), meSwapper._id),
                q.eq(q.field("targetSwapper"), middlemanSwapper._id),
                q.eq(q.field("middlemanSwapper"), targetSwapper._id)
              ),
              q.and(
                q.eq(q.field("initiator"), targetSwapper._id),
                q.eq(q.field("targetSwapper"), meSwapper._id),
                q.eq(q.field("middlemanSwapper"), middlemanSwapper._id)
              ),
              q.and(
                q.eq(q.field("initiator"), targetSwapper._id),
                q.eq(q.field("targetSwapper"), middlemanSwapper._id),
                q.eq(q.field("middlemanSwapper"), meSwapper._id)
              ),
              q.and(
                q.eq(q.field("initiator"), middlemanSwapper._id),
                q.eq(q.field("targetSwapper"), meSwapper._id),
                q.eq(q.field("middlemanSwapper"), targetSwapper._id)
              ),
              q.and(
                q.eq(q.field("initiator"), middlemanSwapper._id),
                q.eq(q.field("targetSwapper"), targetSwapper._id),
                q.eq(q.field("middlemanSwapper"), meSwapper._id)
              )
            ),
            q.eq(q.field("courseId"), course._id),
            q.eq(q.field("isCompleted"), false)
          );
        }
        return q.and(
          q.or(
            q.and(
              q.eq(q.field("initiator"), meSwapper._id),
              q.eq(q.field("targetSwapper"), targetSwapper._id),
              q.eq(q.field("middlemanSwapper"), undefined)
            ),
            q.and(
              q.eq(q.field("initiator"), targetSwapper._id),
              q.eq(q.field("targetSwapper"), meSwapper._id),
              q.eq(q.field("middlemanSwapper"), undefined)
            )
          ),
          q.eq(q.field("courseId"), course._id),
          q.eq(q.field("isCompleted"), false)
        );
      })
      .first();

    if (existingRequests) {
      throw new ConvexError(
        "You have already requested a swap for this course."
      );
    }

    const swapRequestId = await ctx.db.insert("swap_requests", {
      courseId: course._id,
      initiator: meSwapper._id,
      targetSwapper: targetSwapper._id,
      middlemanSwapper: middlemanSwapper?._id,
      acceptedByInitiator: true,
      acceptedByTargetSwapper: false,
      acceptedByMiddlemanSwapper: false,
      isCompleted: false,
    });

    // const targetAcceptPayloadId = await ctx.db.insert(
    //   "telegram_callback_data",
    //   {
    //     callbackData: serializeAccept(
    //       targetUser._id,
    //       meSwapper._id,
    //       targetSwapper._id,
    //       middlemanSwapper?._id
    //     ),
    //   }
    // );
    // const targetDeclinePayloadId = await ctx.db.insert(
    //   "telegram_callback_data",
    //   {
    //     callbackData: serializeDecline(
    //       targetUser._id,
    //       meSwapper._id,
    //       targetSwapper._id,
    //       middlemanSwapper?._id
    //     ),
    //   }
    // );

    // let middlemanAcceptPayloadId: Id<"telegram_callback_data"> | null = null;
    // let middlemanDeclinePayloadId: Id<"telegram_callback_data"> | null = null;
    // if (middlemanSwapperUser) {
    //   middlemanAcceptPayloadId = await ctx.db.insert("telegram_callback_data", {
    //     callbackData: serializeAccept(
    //       middlemanSwapperUser._id,
    //       meSwapper._id,
    //       targetSwapper._id,
    //       middlemanSwapper?._id
    //     ),
    //   });
    //   middlemanDeclinePayloadId = await ctx.db.insert(
    //     "telegram_callback_data",
    //     {
    //       callbackData: serializeDecline(
    //         middlemanSwapperUser._id,
    //         meSwapper._id,
    //         targetSwapper._id,
    //         middlemanSwapper?._id
    //       ),
    //     }
    //   );
    // }

    return {
      requestId: swapRequestId,
      course: {
        id: course._id,
        code: course.code,
        name: course.name,
        ay: course.ay,
        semester: course.semester,
      },
      initiator: {
        id: meSwapper._id,
        telegramUserId: meUser.telegramUserId,
        handle: meUser.handle,
        index: meSwapper.index,
        username: meUser.username,
      },
      target: {
        id: targetSwapper._id,
        telegramUserId: targetUser.telegramUserId,
        handle: targetUser.handle,
        index: targetSwapper.index,
        username: targetUser.username,
        // webhook: {
        //   accept: targetAcceptPayloadId,
        //   decline: targetDeclinePayloadId,
        // },
      },
      middleman:
        middlemanSwapper && middlemanSwapperUser
          ? {
              id: middlemanSwapper._id,
              telegramUserId: middlemanSwapperUser.telegramUserId,
              handle: middlemanSwapperUser.handle,
              index: middlemanSwapper.index,
              username: middlemanSwapperUser.username,
              // webhook: {
              //   accept: middlemanAcceptPayloadId,
              //   decline: middlemanDeclinePayloadId,
              // },
            }
          : null,
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
    const { user: meUser } = await getAuth(ctx);

    const otherSwapper = await ctx.db.get(args.otherSwapperId);
    if (!otherSwapper || otherSwapper.courseId !== args.courseId) {
      throw new ConvexError("Swap request not found.");
    }

    const mySwappers = await ctx.db
      .query("swapper")
      .withIndex("by_userId", (q) => q.eq("userId", meUser._id))
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

// export const handleSwapRequestWebhookCallback = internalMutation({
//   args: {
//     payloadId: v.id("telegram_callback_data"),
//     fromTelegramUserId: v.int64(),
//   },
//   handler: async (ctx, args) => {
//     const payload = await ctx.db.get(args.payloadId);
//     if (!payload) {
//       throw new ConvexError("Callback payload not found.");
//     }
//     const actionInfo = getAction(payload.callbackData);
//     if (!actionInfo) {
//       throw new ConvexError("Invalid callback data.");
//     }
//     if (
//       actionInfo.action !== COMMAND_PREFIX.ACCEPT &&
//       actionInfo.action !== COMMAND_PREFIX.DECLINE
//     ) {
//       throw new ConvexError("Invalid callback action.");
//     }
//     const parsed =
//       actionInfo.action === COMMAND_PREFIX.ACCEPT
//         ? deserializeAccept(payload.callbackData)
//         : deserializeDecline(payload.callbackData);
//     if (!parsed) {
//       throw new ConvexError("Invalid callback payload.");
//     }
//     const parsedInitiator = parsed.initiator;
//     const parsedTargetSwapper = parsed.targetSwapper;
//     const parsedMiddlemanSwapper = parsed.middlemanSwapper;
//     // const parsedCourseId = parsed.courseId as Id<"courses">;
//     // const parsedSwapper1Id = parsed.swapper1 as Id<"swapper">;
//     // const parsedSwapper2Id = parsed.swapper2 as Id<"swapper">;

//     const initiator = await ctx.db.get(parsedInitiator);
//     const targetSwapper = await ctx.db.get(parsedTargetSwapper);

//     if (!initiator) {
//       throw new ConvexError("Initiator not found.");
//     }
//     if (!targetSwapper) {
//       throw new ConvexError("Target swapper not found.");
//     }

//     if (initiator.courseId !== targetSwapper.courseId) {
//       throw new ConvexError(
//         "Initiator and target swapper are not for the same course."
//       );
//     }

//     const initiatorUser = await ctx.db.get(initiator.userId);
//     if (!initiatorUser) {
//       throw new ConvexError("Initiator user not found.");
//     }
//     const targetSwapperUser = await ctx.db.get(targetSwapper.userId);
//     if (!targetSwapperUser) {
//       throw new ConvexError("Target swapper user not found.");
//     }

//     // If set, 3 way swap.
//     let isDirectSwap = true;
//     let middlemanSwapper: typeof initiator | null = null;
//     let middlemanSwapperUser: typeof initiatorUser | null = null;
//     if (parsedMiddlemanSwapper) {
//       isDirectSwap = false;
//       middlemanSwapper = await ctx.db.get(parsedMiddlemanSwapper);
//       if (!middlemanSwapper) {
//         throw new ConvexError("Middleman swapper not found.");
//       }
//       if (middlemanSwapper.courseId !== initiator.courseId) {
//         throw new ConvexError(
//           "Middleman swapper is not for the same course as the initiator."
//         );
//       }
//       middlemanSwapperUser = await ctx.db.get(middlemanSwapper.userId);
//       if (!middlemanSwapperUser) {
//         throw new ConvexError("Middleman swapper user not found.");
//       }
//     }

//     // Determine who the caller is.
//     let iam: "initiator" | "targetSwapper" | "middlemanSwapper" = "initiator";
//     if (parsed.myUserId === initiatorUser._id) {
//       throw new ConvexError("You cannot accept your own swap request.");
//       // iam = "initiator";
//     } else if (parsed.myUserId === targetSwapperUser._id) {
//       iam = "targetSwapper";
//     } else if (parsed.myUserId === middlemanSwapperUser?._id) {
//       iam = "middlemanSwapper";
//     } else {
//       throw new ConvexError("Not a participant in this swap request");
//     }

//     const requests = await ctx.db
//       .query("swap_requests")
//       .withIndex("by_courseId_initiator_targetSwapper_middlemanSwapper", (q) =>
//         q
//           .eq("courseId", initiator.courseId)
//           .eq("initiator", initiator._id)
//           .eq("targetSwapper", targetSwapper._id)
//           .eq("middlemanSwapper", middlemanSwapper?._id)
//       )
//       .collect();
//     // Exclude completed requests.
//     const incompletedRequests = requests.filter((r) => !r.isCompleted);
//     if (incompletedRequests.length <= 0) {
//       throw new ConvexError("Swap request not found.");
//     }
//     const request = incompletedRequests[0];
//     if (incompletedRequests.length > 1) {
//       throw new ConvexError("Multiple swap requests found.");
//     }

//     const course = await ctx.db.get(initiator.courseId);
//     if (!course) {
//       throw new ConvexError("Course not found");
//     }

//     const action =
//       actionInfo.action === COMMAND_PREFIX.ACCEPT ? "accept" : "decline";

//     let isCompleted = false;
//     let acceptedByInitiator = request.acceptedByInitiator;
//     let acceptedByTargetSwapper = request.acceptedByTargetSwapper;
//     let acceptedByMiddlemanSwapper = request.acceptedByMiddlemanSwapper;
//     if (action === "accept") {
//       if (iam === "middlemanSwapper") {
//         isCompleted =
//           request.acceptedByInitiator && request.acceptedByTargetSwapper;
//         acceptedByMiddlemanSwapper = true;
//         await ctx.db.patch(request._id, {
//           acceptedByMiddlemanSwapper: true,
//           isCompleted: isCompleted,
//         });
//       } else if (iam === "targetSwapper") {
//         isCompleted = isDirectSwap
//           ? request.acceptedByInitiator
//           : request.acceptedByMiddlemanSwapper && request.acceptedByInitiator;
//         acceptedByTargetSwapper = true;
//         await ctx.db.patch(request._id, {
//           acceptedByTargetSwapper: true,
//           isCompleted: isCompleted,
//         });
//       }

//       if (isCompleted) {
//         await Promise.all([
//           ctx.db.patch(initiator._id, { hasSwapped: true }),
//           ctx.db.patch(targetSwapper._id, { hasSwapped: true }),
//           (async () => {
//             if (middlemanSwapper) {
//               await ctx.db.patch(middlemanSwapper._id, { hasSwapped: true });
//             }
//           })(),
//         ]);
//       }
//     } else {
//       await ctx.db.patch(request._id, {
//         isCompleted: true,
//       });
//     }

//     return {
//       action,
//       isDirectSwap,
//       isCompleted,
//       course: {
//         code: course.code,
//         name: course.name,
//       },
//       iam,
//       initiator: {
//         handle: initiatorUser.handle,
//         telegramUserId: initiatorUser.telegramUserId,
//         acceptedByInitiator,
//         index: initiator.index,
//       },
//       targetSwapper: {
//         handle: targetSwapperUser.handle,
//         telegramUserId: targetSwapperUser.telegramUserId,
//         acceptedByTargetSwapper,
//         index: targetSwapper.index,
//       },
//       middlemanSwapper:
//         middlemanSwapperUser && middlemanSwapper
//           ? {
//               handle: middlemanSwapperUser.handle,
//               telegramUserId: middlemanSwapperUser.telegramUserId,
//               acceptedByMiddlemanSwapper,
//               index: middlemanSwapper.index,
//             }
//           : null,
//       // thisTelegramUserId: Number(thisUser.telegramUserId),
//       // otherTelegramUserId: Number(otherUser.telegramUserId),
//       // otherUsername: user2.handle,
//     };
//   },
// });

export const setProfile = mutation({
  args: {
    username: v.string(),
    school: schoolValidator,
  },
  handler: async (ctx, args) => {
    // Make sure username is alphanumeric and not empty.
    const usernameResult = isAllowedUsername(args.username);
    if (usernameResult.type === "error") {
      throw new ConvexError(usernameResult.message);
    }
    const username = usernameResult.username;

    const { user } = await getAuth(ctx, false);

    await ctx.db.patch(user._id, {
      username,
      school: args.school,
    });

    return {
      success: true,
    };
  },
});

const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
function generateCode() {
  let code = "";
  for (let i = 0; i < 24; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
const VERIFICATION_CODE_EXPIRATION_TIME_MS = 10 * 60 * 1000;

export const requestLinkTelegramAccount = internalMutation({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const { email } = await getIdentity(ctx);

    // Get existing verification code for this email.
    const existing = await ctx.db
      .query("telegram_user_verification")
      .withIndex("by_email", (q) => q.eq("email", email))
      // Sort by creation time descending.
      .order("desc")
      .first();
    // Verify created at is within last 10mins.
    if (
      existing &&
      existing._creationTime > Date.now() - VERIFICATION_CODE_EXPIRATION_TIME_MS
    ) {
      return { success: true, code: existing.code, email };
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!existingUser) {
      await ctx.db.insert("users", {
        email,
        username: args.username,
        handle: "",
        telegramUserId: BigInt(-1),
        school: "",
      });
    }
    const code = generateCode();
    await ctx.db.insert("telegram_user_verification", {
      email,
      code,
    });
    return { success: true, code, email };
  },
});

export const verifyTelegramAccount = internalMutation({
  args: {
    email: v.string(),
    code: v.string(),
    telegramUserId: v.int64(),
    telegramHandle: v.string(),
    directCreation: v.optional(
      v.object({
        username: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    if (args.directCreation) {
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.email))
        .first();

      if (existingUser) {
        await ctx.db.patch(existingUser._id, {
          telegramUserId: args.telegramUserId,
          handle: args.telegramHandle,
          email: args.email,
        });
      } else {
        await ctx.db.insert("users", {
          telegramUserId: args.telegramUserId,
          handle: args.telegramHandle,
          username: args.directCreation.username,
          email: args.email,
          school: "",
        });
      }
      return { success: true };
    }
    const existing = await ctx.db
      .query("telegram_user_verification")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .order("desc")
      .first();
    if (!existing || existing.code !== args.code) {
      return { success: false };
    }

    await ctx.db.delete(existing._id);
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!existingUser) {
      throw new ConvexError("User not found");
    }

    await ctx.db.patch(existingUser._id, {
      telegramUserId: args.telegramUserId,
      handle: args.telegramHandle,
      email: args.email,
    });
    // if (existingUser) {
    //   await ctx.db.patch(existingUser._id, {
    //     telegramUserId: args.telegramUserId,
    //     handle: args.telegramHandle,
    //     email: args.email,
    //   });
    // } else {
    //   await ctx.db.insert("users", {
    //     telegramUserId: args.telegramUserId,
    //     handle: args.telegramHandle,
    //     username: args.username,
    //     email: args.email,
    //     school: "",
    //   });
    // }

    return { success: true };
  },
});

function nameMockEmail(email: string, number: number) {
  return `MOCK_${number}:${email}`;
}

export const getAllMockAccounts = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await getAuth(ctx);
    const realEmail = user.email.replaceAll(/^MOCK_\d+:/g, "");

    const accounts = await ctx.db.query("users").collect();
    return accounts.filter(
      (u) => u.email.startsWith("MOCK_") && u.email.endsWith(`:${realEmail}`)
    );
  },
});

export const duplicateAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const { user } = await getAuth(ctx);

    const realEmail = user.email.replaceAll(/^MOCK_\d+:/g, "");
    const realUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", realEmail))
      .first();
    if (!realUser) {
      throw new ConvexError("Real user not found");
    }

    const countUsers = await ctx.db.query("users").collect();
    const existingUsers = countUsers.filter(
      (u) => u.email.startsWith("MOCK_") && u.email.endsWith(`:${realEmail}`)
    );
    const newEmail = nameMockEmail(realEmail, existingUsers.length + 1);
    const newHandle = `${realUser.handle} (${existingUsers.length + 1})`;
    const newUsername = `${realUser.username} (${existingUsers.length + 1})`;
    await ctx.db.insert("users", {
      email: newEmail,
      handle: newHandle,
      username: newUsername,
      telegramUserId: realUser.telegramUserId,
      school: "CCDS",
    });
  },
});
