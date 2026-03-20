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

// export const loadSelf = mutation({
//   args: {},
//   handler: async (ctx) => {
//     const identity = await ctx.auth.getUserIdentity();
//     if (!identity) {
//       throw new ConvexError("Unauthorized");
//     }

//     const telegramUserId = Number(identity.subject);
//     if (!Number.isFinite(telegramUserId)) {
//       throw new ConvexError("Invalid auth subject");
//     }

//     const handle = identity.nickname ?? identity.name ?? "unknown";

//     const existing = await ctx.db
//       .query("users")
//       .withIndex("by_userId", (q) => q.eq("userId", BigInt(telegramUserId)))
//       .unique();

//     if (existing) {
//       await ctx.db.patch(existing._id, {
//         handle,
//         school: "abc",
//         // joinDate: existing.joinDate ?? Date.now(),
//       });
//       return existing._id;
//     }

//     return await ctx.db.insert("users", {
//       userId: BigInt(telegramUserId),
//       handle,
//       school: "abc",
//     });
//   },
// });

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

    const requests = await ctx.db
      .query("swapper")
      .withIndex("by_telegramUserId", (q) => q.eq("telegramUserId", me))
      .collect();

    const myWants = await ctx.db
      .query("swapper_wants")
      .withIndex("by_telegramUserId", (q) => q.eq("telegramUserId", me))
      .collect();

    const allSwapRequests = await ctx.db.query("swap_requests").collect();

    const matchCountsByCourse = new Map<string, number>();
    for (const want of myWants) {
      const possibleMatches = await ctx.db
        .query("swapper")
        .withIndex("by_courseId_index", (q) =>
          q.eq("courseId", want.courseId).eq("index", want.wantIndex)
        )
        .collect();

      let count = 0;
      for (const candidate of possibleMatches) {
        if (candidate.hasSwapped) continue;
        if (candidate.telegramUserId === me) continue;

        // Keep parity with old SQL join on users table.
        const user = await ctx.db
          .query("users")
          .withIndex("by_userId", (q) =>
            q.eq("userId", candidate.telegramUserId)
          )
          .unique();
        if (!user) continue;

        count += 1;
      }

      const key = want.courseId;
      matchCountsByCourse.set(key, (matchCountsByCourse.get(key) ?? 0) + count);
    }

    const pendingCountsByCourse = new Map<string, number>();
    for (const request of allSwapRequests) {
      const swapper1 = await ctx.db.get(request.swapper1);
      const swapper2 = await ctx.db.get(request.swapper2);
      if (!swapper1 || !swapper2) continue;

      const involvesMe =
        swapper1.telegramUserId === me || swapper2.telegramUserId === me;
      if (!involvesMe) continue;
      if (swapper1.hasSwapped || swapper2.hasSwapped) continue;

      const key = request.courseId;
      pendingCountsByCourse.set(key, (pendingCountsByCourse.get(key) ?? 0) + 1);
    }

    return await Promise.all(
      requests.map(async (request) => {
        const course = await ctx.db.get(request.courseId);
        if (!course) {
          throw new ConvexError("Course not found for swapper record");
        }

        return {
          course: {
            id: request.courseId,
            code: course.code,
            name: course.name,
          },
          hasSwapped: request.hasSwapped,
          matchCount: matchCountsByCourse.get(request.courseId) ?? 0,
          pendingRequestCount: pendingCountsByCourse.get(request.courseId) ?? 0,
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
    const rows = await ctx.db
      .query("course_index")
      .withIndex("by_courseId", (q) => q.eq("courseId", args.courseId))
      .collect();

    const swappers = await ctx.db
      .query("swapper")
      .withIndex("by_courseId_index", (q) => q.eq("courseId", args.courseId))
      .collect();

    const wants = await ctx.db
      .query("swapper_wants")
      .withIndex("by_courseId_wantIndex", (q) =>
        q.eq("courseId", args.courseId)
      )
      .collect();

    const haveCountByIndex = new Map<string, number>();
    for (const s of swappers) {
      haveCountByIndex.set(s.index, (haveCountByIndex.get(s.index) ?? 0) + 1);
    }
    const wantCountByIndex = new Map<string, number>();
    for (const w of wants) {
      wantCountByIndex.set(
        w.wantIndex,
        (wantCountByIndex.get(w.wantIndex) ?? 0) + 1
      );
    }

    return rows.map((r) => ({
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

    const mySwappers = await ctx.db
      .query("swapper")
      .withIndex("by_telegramUserId", (q) => q.eq("telegramUserId", me))
      .collect();
    const swapper = mySwappers.find((s) => s.courseId === courseId);

    const myWants = await ctx.db
      .query("swapper_wants")
      .withIndex("by_telegramUserId", (q) => q.eq("telegramUserId", me))
      .collect();
    const wantsForCourse = myWants.filter((w) => w.courseId === courseId);

    return {
      haveIndex: swapper?.index ?? null,
      wantIndexes: wantsForCourse.map((w) => w.wantIndex),
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

    const me = BigInt(identity.subject);
    const meNumber = Number(me);
    if (!Number.isFinite(meNumber)) {
      throw new ConvexError("Invalid auth subject");
    }

    const course = await ctx.db.get(args.courseId);
    if (!course) {
      throw new ConvexError("Course not found.");
    }

    const otherSwapper = await ctx.db.get(args.otherSwapperId);
    if (!otherSwapper || otherSwapper.courseId !== args.courseId) {
      throw new ConvexError("Swap request not found.");
    }
    if (otherSwapper.telegramUserId === me) {
      throw new ConvexError("Cannot request a swap with yourself.");
    }
    if (otherSwapper.hasSwapped) {
      throw new ConvexError("The swapper is no longer looking to swap.");
    }

    const mySwapper = await ctx.db
      .query("swapper")
      .filter((q) => q.eq(q.field("courseId"), args.courseId))
      .withIndex("by_telegramUserId", (q) => q.eq("telegramUserId", me))
      .first();
    if (!mySwapper) {
      throw new ConvexError(
        "You have not set your index, please set one under your Telegram settings."
      );
    }

    const swapper1 =
      me > otherSwapper.telegramUserId ? mySwapper._id : otherSwapper._id;
    const swapper2 =
      me > otherSwapper.telegramUserId ? otherSwapper._id : mySwapper._id;

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
      initiator: meNumber,
      requestedAt: Date.now(),
    });

    return {
      course,
      mySwapper,
      otherSwapper,
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
