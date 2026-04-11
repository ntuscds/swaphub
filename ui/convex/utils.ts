import { ConvexError } from "convex/values";
import { ActionCtx, QueryCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { ALLOWED_DOMAINS } from "@/lib/user";

export function getAccountSetupFromUser(user: Doc<"users">) {
  // -1 means telegram not setup
  if (user.telegramUserId < 0) {
    return "telegram_not_setup" as const;
  }
  if (!user.school) {
    return "school_not_setup" as const;
  }
  return "complete" as const;
}

export async function getIdentityFromAction(ctx: ActionCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Unauthorized");
  }
  const email = identity.email ?? identity.subject;
  return { email, identity };
}

export async function getIdentity(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Unauthorized");
  }
  const email = identity.email ?? identity.subject;
  return { email, identity };
}

export async function getAuth(ctx: QueryCtx, requiresComplete: boolean = true) {
  const { email, identity } = await getIdentity(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();
  if (!user) {
    throw new ConvexError("User not found");
  }

  if (requiresComplete && !user.telegramUserId) {
    throw new ConvexError("Telegram not setup");
  }
  if (requiresComplete && !user.school) {
    throw new ConvexError("School not setup");
  }

  const isAllowedDomain = ALLOWED_DOMAINS.some((domain) =>
    email.endsWith(domain)
  );
  if (!isAllowedDomain) {
    throw new ConvexError("Email not allowed");
  }

  return {
    email,
    identity,
    user,
    accountSetup: getAccountSetupFromUser(user),
  };
}
