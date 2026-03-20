import { CurrentAcadYear } from "@/lib/acad";
import { schools } from "@/lib/types";
import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

const schoolValidator = v.union(...schools.map((school) => v.literal(school)));

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
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("courses")
      .filter((q) =>
        q.and(
          q.eq(q.field("ay"), CurrentAcadYear.ay),
          q.eq(q.field("semester"), CurrentAcadYear.semester)
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
  },
  handler: async (ctx, args) => {
    const course = await ctx.db
      .query("courses")
      .withIndex("by_code_ay_semester", (q) =>
        q
          .eq("code", args.courseCode)
          .eq("ay", CurrentAcadYear.ay)
          .eq("semester", CurrentAcadYear.semester)
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
      .withIndex("by_courseId_wantIndex", (q) => q.eq("courseId", args.courseId))
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
    const toAdd = args.wantIndexes.filter((idx) => !currentWantStrings.has(idx));

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
