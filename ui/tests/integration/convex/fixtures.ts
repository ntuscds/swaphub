import { convexTest } from "convex-test";
import type { Id } from "../../../convex/_generated/dataModel";
import schema from "../../../convex/schema";

// The generated files let convex-test resolve the actual registered handlers.
const modules = import.meta.glob("../../../convex/**/*.{ts,js}");
export const createBackend = () => convexTest(schema, modules);
export type Backend = ReturnType<typeof createBackend>;

export function asUser(t: Backend, username: string) {
  return t.withIdentity({ email: `${username}@e.ntu.edu.sg` });
}

export async function course(t: Backend, code = "SC1003", semester = "1", count = 18) {
  return t.run(async (ctx) => {
    const id = await ctx.db.insert("courses", {
      code, name: `Fixture ${code}`, au: 3, ay: "26/27", semester,
      searchText: code, isAvailableUE: false, isAvailableBD: false,
      isAvailableGEPE: false, isSelfPaced: false,
    });
    for (let index = 1; index <= count; index++) {
      await ctx.db.insert("course_index", { courseId: id, index: String(index) });
    }
    return id;
  });
}

export async function student(
  t: Backend, courseId: Id<"courses">, username: string, index: string,
  wants: string[], school = "CCDS", hasSwapped = false,
) {
  return t.run(async (ctx) => {
    const existing = await ctx.db.query("users")
      .withIndex("by_email", q => q.eq("email", `${username}@e.ntu.edu.sg`)).unique();
    const userId = existing?._id ?? await ctx.db.insert("users", {
      username, handle: `${username}_telegram`, email: `${username}@e.ntu.edu.sg`,
      school, telegramUserId: BigInt(1000 + (await ctx.db.query("users").collect()).length),
    });
    const id = await ctx.db.insert("swapper", { userId, courseId, index, hasSwapped });
    for (const wantIndex of wants) {
      await ctx.db.insert("swapper_wants", { swapperId: id, wantIndex, requestedAt: 100 });
    }
    return id;
  });
}

export async function request(
  t: Backend, courseId: Id<"courses">, initiator: Id<"swapper">,
  targetSwapper: Id<"swapper">, middlemanSwapper?: Id<"swapper">,
  isCompleted = false,
) {
  return t.run(ctx => ctx.db.insert("swap_requests", {
    courseId, initiator, targetSwapper,
    ...(middlemanSwapper ? { middlemanSwapper } : {}),
    acceptedByInitiator: true, acceptedByTargetSwapper: false,
    acceptedByMiddlemanSwapper: false, isCompleted,
  }));
}

export async function snapshot(t: Backend) {
  return t.run(async ctx => ({
    users: await ctx.db.query("users").collect(),
    swappers: await ctx.db.query("swapper").collect(),
    wants: await ctx.db.query("swapper_wants").collect(),
    requests: await ctx.db.query("swap_requests").collect(),
  }));
}
