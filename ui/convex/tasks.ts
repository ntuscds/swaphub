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
