import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

export const getSelf = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    const telegramUserId = Number(identity.subject);
    if (!Number.isFinite(telegramUserId)) {
      throw new ConvexError("Invalid auth subject");
    }

    return await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", telegramUserId))
      .unique();
  },
});

export const loadSelf = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    const telegramUserId = Number(identity.subject);
    if (!Number.isFinite(telegramUserId)) {
      throw new ConvexError("Invalid auth subject");
    }

    const handle = identity.nickname ?? identity.name ?? "unknown";

    const existing = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", telegramUserId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        handle,
        school: "abc",
        joinDate: existing.joinDate ?? Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      userId: telegramUserId,
      handle,
      school: "abc",
      joinDate: Date.now(),
    });
  },
});
