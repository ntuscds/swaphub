"use node";

import { v } from "convex/values";
import { action, internalAction } from "../_generated/server";
import { ConvexError } from "convex/values";
import { bot } from "@/telegram/telegram";
import { api, internal } from "../_generated/api";

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

export const sendSwapRequest = action({
  args: {
    courseId: v.id("courses"),
    otherSwapperId: v.id("swapper"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthorized");

    const result = await ctx.runMutation(internal.tasks.requestSwap, {
      courseId: args.courseId,
      otherSwapperId: args.otherSwapperId,
    });
    // const otherSwapper = await ctx.db.get(args.otherSwapperId);
    // if (!otherSwapper || otherSwapper.courseId !== args.courseId) {
    //   throw new ConvexError("Swap request not found.");
    // }

    // const mySwappers = await ctx.db
    //   .query("swapper")
    //   .withIndex("by_telegramUserId", (q) => q.eq("telegramUserId", me))
    //   .collect();
    // const mySwapper = mySwappers.find((s) => s.courseId === args.courseId);
    // if (!mySwapper) throw new ConvexError("Swapper not found.");

    // if (otherSwapper.telegramUserId === me) {
    //   throw new ConvexError("Cannot request a swap with yourself.");
    // }

    // const course = await ctx.db.get(args.courseId);
    // if (!course) throw new ConvexError("Course not found.");

    // const meUser = await ctx.db
    //   .query("users")
    //   .withIndex("by_userId", (q) => q.eq("userId", me))
    //   .unique();

    const { course, mySwapper, otherSwapper } = result;
    const username = meUser?.handle ?? "???";

    const myIndexUrl = buildFStarsUrl(
      course.code,
      mySwapper.index,
      course.ay,
      course.semester
    );
    const otherIndexUrl = buildFStarsUrl(
      course.code,
      otherSwapper.index,
      course.ay,
      course.semester
    );

    await bot.sendMessage(
      Number(otherSwapper.telegramUserId),
      `*${escapeMarkdown(course.code)} ${escapeMarkdown(course.name)} Swap Request*\\n@${escapeMarkdown(
        username
      )} wants to swap with you!\\n\\nThey have: [${escapeMarkdown(
        mySwapper.index
      )}](${myIndexUrl})\\nYou have: [${escapeMarkdown(
        otherSwapper.index
      )}](${otherIndexUrl}).\\n\\nTap "Accept" to confirm the swap, or "Already Swapped" if you've swapped elsewhere.`,
      {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }
    );
  },
});

export const sendSwapCallbackTelegram = internalAction({
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
    if (!mySwapper) throw new ConvexError("Swapper not found.");

    const course = await ctx.db.get(args.courseId);
    if (!course) throw new ConvexError("Course not found.");

    const meUser = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", me))
      .unique();

    const username = meUser?.handle ?? "???";
    const courseLabel = `${course.code} ${course.name}`;

    if (args.action === "accept") {
      await bot.sendMessage(
        Number(otherSwapper.telegramUserId),
        `*Swap confirmed for ${escapeMarkdown(
          courseLabel
        )}*\\n@${escapeMarkdown(username)} has accepted your swap request, they may get in touch with you, please make sure your DMs are open.`,
        { parse_mode: "Markdown" }
      );
      await bot.sendMessage(
        Number(mySwapper.telegramUserId),
        `*Successfully sent swap request*\\nPlease message @${escapeMarkdown(
          username
        )} to proceed with the swap.`,
        { parse_mode: "Markdown" }
      );
    } else {
      await bot.sendMessage(
        Number(mySwapper.telegramUserId),
        `*Marked ${escapeMarkdown(courseLabel)} as already swapped*.`,
        { parse_mode: "Markdown" }
      );
    }
  },
});
