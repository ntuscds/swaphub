import { expect, test } from "vitest";
import { api, internal } from "../../../convex/_generated/api";
import { asUser, course, createBackend, snapshot, student } from "./fixtures";

test("16 distinct wanted indexes save; a seventeenth is rejected without changing preferences", async () => {
  // SC1003 has indexes 1–18; Alice holds 1 and initially wants 2.
  // - Save 2–17 plus duplicate 2 (16 distinct wants), then try 2–18 (17 distinct).
  // Expect the boundary save to persist and the rejected edit to preserve it.
  const t = createBackend();
  const id = await course(t);
  const alice = await student(t, id, "alice", "1", ["2"]);
  const wants = Array.from({ length: 16 }, (_, i) => String(i + 2));
  await asUser(t, "alice").mutation(api.tasks.setRequest, {
    courseId: id, haveIndex: "1", wantIndexes: [...wants, "2"],
  });
  const saved = await snapshot(t);
  expect(saved.wants.filter(w => w.swapperId === alice).map(w => w.wantIndex).sort())
    .toEqual([...wants].sort());
  // Index 18 is valid: this rejects the count, rather than index membership.
  await expect(asUser(t, "alice").mutation(api.tasks.setRequest, {
    courseId: id, haveIndex: "1", wantIndexes: [...wants, "18"],
  })).rejects.toThrow("At most 16 wanted indexes");
  expect(await snapshot(t)).toEqual(saved);
});

test("duplicate wanted indexes are deduplicated and editing retains unchanged historical wants", async () => {
  // Alice: SC1003 held 1, wants 2/3 at timestamp 100; SC1004 held 4, wants 5.
  // - Edit SC1003 to held 4 and wants 3/5/5.
  // Expect want 2 removed, want 3 unchanged, one new want 5, and SC1004 intact.
  const t = createBackend();
  const id = await course(t);
  const other = await course(t, "SC1004");
  const alice = await student(t, id, "alice", "1", ["2", "3"]);
  await student(t, other, "alice", "4", ["5"]);
  const before = await snapshot(t);
  const retained = before.wants.find(w => w.swapperId === alice && w.wantIndex === "3");
  await asUser(t, "alice").mutation(api.tasks.setRequest, {
    courseId: id, haveIndex: "4", wantIndexes: ["3", "5", "5"],
  });
  const after = await snapshot(t);
  expect(after.swappers.find(s => s._id === alice)).toEqual({
    ...before.swappers.find(s => s._id === alice), index: "4",
  });
  const wants = after.wants.filter(w => w.swapperId === alice);
  expect(wants.map(w => w.wantIndex).sort()).toEqual(["3", "5"]);
  // The retained row keeps its ID and requestedAt; unrelated course rows are exact.
  expect(wants.find(w => w.wantIndex === "3")).toEqual(retained);
  expect(after.swappers.filter(s => s.courseId === other))
    .toEqual(before.swappers.filter(s => s.courseId === other));
  expect(after.wants.filter(w => w.swapperId !== alice))
    .toEqual(before.wants.filter(w => w.swapperId !== alice));
});

test.each([
  { held: "99", wants: ["2"], error: "Held index does not belong" },
  { held: "1", wants: ["99"], error: "A wanted index does not belong" },
  { held: "1", wants: ["1", "2"], error: "held index cannot also be a wanted" },
])("invalid held/wanted edit ($held, $wants) preserves all existing data", async ({ held, wants, error }) => {
  // SC1003 has 1–18; Alice already holds 1 and wants 2/3 at timestamp 100.
  // - Try held 99, wanted 99, or held 1 also wanted.
  // Expect each rejected mutation to leave Alice's rows exactly unchanged.
  const t = createBackend();
  const id = await course(t);
  await student(t, id, "alice", "1", ["2", "3"]);
  const before = await snapshot(t);
  await expect(asUser(t, "alice").mutation(api.tasks.setRequest, {
    courseId: id, haveIndex: held, wantIndexes: wants,
  })).rejects.toThrow(error);
  expect(await snapshot(t)).toEqual(before);
});

test.each([
  { identity: undefined, school: "CCDS", email: "alice@e.ntu.edu.sg", error: "Unauthorized" },
  { identity: "missing@e.ntu.edu.sg", school: "CCDS", email: "alice@e.ntu.edu.sg", error: "User not found" },
  { identity: "alice@e.ntu.edu.sg", school: "", email: "alice@e.ntu.edu.sg", error: "Account setup is incomplete" },
  { identity: "alice@example.com", school: "CCDS", email: "alice@example.com", error: "Email not allowed" },
])("unauthorized account ($error) cannot read matches, edit preferences or file requests", async ({ identity, school, email, error }) => {
  // Alice holds SC1003 index 1 and wants Bob's 2; Bob reciprocally wants 1.
  // - No identity, unregistered NTU identity, incomplete school, or non-NTU email.
  // Expect reads/writes rejected and both students' existing rows preserved.
  const t = createBackend();
  const id = await course(t);
  const alice = await student(t, id, "alice", "1", ["2"]);
  const bob = await student(t, id, "bob", "2", ["1"]);
  await t.run(async ctx => {
    const s = await ctx.db.get(alice);
    await ctx.db.patch(s!.userId, { school, email });
  });
  const before = await snapshot(t);
  const actor = identity ? t.withIdentity({ email: identity }) : t;
  // Check both public handlers and the authenticated internal filing boundary.
  await expect(actor.query(api.tasks.getCourseRequestAndMatches, { courseCode: "SC1003" })).rejects.toThrow(error);
  await expect(actor.mutation(api.tasks.setRequest, { courseId: id, haveIndex: "1", wantIndexes: ["3"] })).rejects.toThrow(error);
  await expect(actor.mutation(internal.tasks.requestSwap, { targetSwapperId: bob })).rejects.toThrow(error);
  expect(await snapshot(t)).toEqual(before);
});
