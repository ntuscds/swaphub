import { CurrentAcadYear } from "@/lib/acad";
import { schools } from "@/lib/types";
import { internalMutation, mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

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
            pendingRequests,
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    const me = BigInt(identity.subject);
    const courseId = args.courseId;

    const courseIndexes = await ctx.db
      .query("course_index")
      .withIndex("by_courseId", (q) => q.eq("courseId", args.courseId))
      .collect();

    // const meSwapper = await ctx.db
    //   .query("swapper")
    //   .withIndex("by_telegramUserId_courseId", (q) =>
    //     q.eq("telegramUserId", me).eq("courseId", courseId)
    //   )
    //   .unique();
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

    // const meSwapper = allSwappers.find((s) => s.telegramUserId === me);

    // const myWants = meSwapper === undefined ? [] : await ctx.db
    //   .query("swapper_wants")
    //   // .filter((q) => q.eq(q.field("swapperId"), meSwapper._id))
    //   .withIndex("by_swapperId", (q) => q.eq("swapperId", meSwapper._id))
    //   .collect();

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

    if (existingSwapper) {
      await ctx.db.patch(existingSwapper._id, { index: args.haveIndex });
    } else {
      await ctx.db.insert("swapper", {
        telegramUserId: me,
        courseId,
        index: args.haveIndex,
        hasSwapped: false,
      });
    }

    const myWants = await ctx.db
      .query("swapper_wants")
      .withIndex("by_telegramUserId", (q) => q.eq("telegramUserId", me))
      .collect();
    const wantsForCourse = myWants.filter((w) => w.courseId === courseId);

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
        telegramUserId: me,
        courseId,
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

    const mySwappers = await ctx.db
      .query("swapper")
      .withIndex("by_telegramUserId", (q) => q.eq("telegramUserId", me))
      .collect();
    const mySwapper = mySwappers.find((s) => s.courseId === courseId);

    if (!mySwapper) {
      throw new ConvexError("You have not set your index for this course.");
    }

    const haveIndex = mySwapper.index;

    const myWantsAll = await ctx.db
      .query("swapper_wants")
      .withIndex("by_telegramUserId", (q) => q.eq("telegramUserId", me))
      .collect();
    const myWants = myWantsAll.filter((w) => w.courseId === courseId);
    const wantIndexes = myWants.map((w) => w.wantIndex);

    // Direct potential matches: other swappers whose `index` equals one of my want indexes.
    const matchByOtherSwapperId = new Map<
      string,
      {
        otherSwapper: (typeof mySwappers)[number];
        wantIndex: string;
        requestedAt: number;
      }
    >();

    for (const want of myWants) {
      const othersForIndex = await ctx.db
        .query("swapper")
        .withIndex("by_courseId_index", (q) =>
          q.eq("courseId", courseId).eq("index", want.wantIndex)
        )
        .collect();

      for (const otherSwapper of othersForIndex) {
        if (otherSwapper.telegramUserId === me) continue;

        const key = otherSwapper._id;
        const requestedAt = want.requestedAt ?? 0;

        const existing = matchByOtherSwapperId.get(key);
        if (!existing || requestedAt > existing.requestedAt) {
          matchByOtherSwapperId.set(key, {
            otherSwapper,
            wantIndex: want.wantIndex,
            requestedAt,
          });
        }
      }
    }

    const candidateOtherSwappers = Array.from(matchByOtherSwapperId.values());

    // Perfect match: other swappers who (also) want my `haveIndex`.
    const otherWantForHaveIndex = await ctx.db
      .query("swapper_wants")
      .withIndex("by_courseId_wantIndex", (q) =>
        q.eq("courseId", courseId).eq("wantIndex", haveIndex)
      )
      .collect();
    const perfectTelegramUserIds = new Set(
      otherWantForHaveIndex
        .map((w) => w.telegramUserId)
        .filter((id) => id !== me)
    );

    const meNumber = Number(me);
    if (!Number.isFinite(meNumber)) {
      throw new ConvexError("Invalid auth subject");
    }

    // Collect all swap requests for this course (no `by_courseId` index exists yet).
    const allSwapRequests = await ctx.db.query("swap_requests").collect();
    const courseSwapRequests = allSwapRequests.filter(
      (r) => r.courseId === courseId
    );

    // Pending requests count by candidate otherSwapperId (recipient, not initiator).
    const candidateOtherSwapperIds = new Set(
      candidateOtherSwappers.map((m) => m.otherSwapper._id)
    );
    const numberOfRequestsByOtherId = new Map<string, number>();
    for (const id of candidateOtherSwapperIds) {
      numberOfRequestsByOtherId.set(id, 0);
    }

    // Helper cache to avoid repeated ctx.db.get calls.
    const swapperCache = new Map<string, any>();
    const getSwapper = async (id: string) => {
      const cached = swapperCache.get(id);
      if (cached) return cached;
      const row = await ctx.db.get(id as any);
      if (row) swapperCache.set(id, row);
      return row;
    };

    for (const req of courseSwapRequests) {
      const initiatorBig = BigInt(req.initiator);
      const s1 = await getSwapper(req.swapper1);
      const s2 = await getSwapper(req.swapper2);
      if (!s1 || !s2) continue;

      if (
        candidateOtherSwapperIds.has(s1._id) &&
        s1.telegramUserId !== initiatorBig
      ) {
        numberOfRequestsByOtherId.set(
          s1._id,
          (numberOfRequestsByOtherId.get(s1._id) ?? 0) + 1
        );
      }
      if (
        candidateOtherSwapperIds.has(s2._id) &&
        s2.telegramUserId !== initiatorBig
      ) {
        numberOfRequestsByOtherId.set(
          s2._id,
          (numberOfRequestsByOtherId.get(s2._id) ?? 0) + 1
        );
      }
    }

    // Swap request existence between me and each other swapper.
    const swapRequestByOtherId = new Map<
      string,
      {
        requestedAt?: number;
        initiator: number;
      } | null
    >();

    for (const m of candidateOtherSwappers) {
      const other = m.otherSwapper;
      const swapper1 = me > other.telegramUserId ? mySwapper._id : other._id;
      const swapper2 = me > other.telegramUserId ? other._id : mySwapper._id;

      const existing = await ctx.db
        .query("swap_requests")
        .withIndex("by_course_swapper_pair", (q) =>
          q
            .eq("courseId", courseId)
            .eq("swapper1", swapper1)
            .eq("swapper2", swapper2)
        )
        .unique();

      swapRequestByOtherId.set(other._id, existing);
    }

    const handleByTelegramUserId = new Map<string, string | undefined>();
    const getHandle = async (telegramUserId: bigint) => {
      const key = telegramUserId.toString();
      if (handleByTelegramUserId.has(key))
        return handleByTelegramUserId.get(key);

      const user = await ctx.db
        .query("users")
        .withIndex("by_userId", (q) => q.eq("userId", telegramUserId))
        .unique();
      const handle = user?.handle;
      handleByTelegramUserId.set(key, handle);
      return handle;
    };

    const perfectMatches: any[] = [];
    const otherMatches: any[] = [];

    for (const m of candidateOtherSwappers) {
      const other = m.otherSwapper;
      const existingReq = swapRequestByOtherId.get(other._id) ?? null;

      if (other.hasSwapped && !existingReq) {
        continue;
      }

      const status: "pending" | "swapped" | undefined = other.hasSwapped
        ? "swapped"
        : existingReq
          ? "pending"
          : undefined;

      const isSelfInitiated =
        existingReq !== null && existingReq?.initiator === meNumber;

      const revealedBy =
        status === "pending" && !isSelfInitiated
          ? await getHandle(other.telegramUserId)
          : undefined;

      const match = {
        id: other._id,
        numberOfRequests: numberOfRequestsByOtherId.get(other._id) ?? 0,
        isPerfectMatch: perfectTelegramUserIds.has(other.telegramUserId),
        index: m.wantIndex,
        isVerified: false,
        requestedAt: m.requestedAt,
        status,
        isSelfInitiated,
        revealedBy,
      };

      if (match.isPerfectMatch) {
        perfectMatches.push(match);
      } else {
        otherMatches.push(match);
      }
    }

    const sortByRequestedAtDesc = (a: any, b: any) =>
      b.requestedAt - a.requestedAt;
    perfectMatches.sort(sortByRequestedAtDesc);
    otherMatches.sort(sortByRequestedAtDesc);

    return {
      course: {
        id: courseId,
        haveIndex,
        hasSwapped: mySwapper.hasSwapped,
      },
      wantIndexes,
      matches: [...perfectMatches, ...otherMatches],
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
    if (otherSwapper.telegramUserId === meId) {
      throw new ConvexError("Cannot request a swap with yourself.");
    }
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

    return {
      course,
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
