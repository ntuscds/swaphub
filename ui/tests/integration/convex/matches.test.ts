import { expect, test } from "vitest";
import { api, internal } from "../../../convex/_generated/api";
import { asUser, course, createBackend, student } from "./fixtures";

test.each(["CC0006", "SC1003"])("%s returns the exact eligible direct and three-way rows", async code => {
  // Alice (CCDS): held 1, wants 2/3. Bob/Eve: held 2, wants 1 (CCDS/NBS).
  // - Carol (CCDS) holds 3, wants 4; Dan/Faye hold 4, want 1 (CCDS/NBS).
  // - Grace already swapped; Hank is nonreciprocal; Ivy is in semester 2.
  // Expect ICC to exclude NBS peers; non-ICC includes them; all decoys excluded.
  const t = createBackend();
  const id = await course(t, code);
  const semester2 = await course(t, code, "2");
  const alice = await student(t, id, "alice", "1", ["2", "3"]);
  const bob = await student(t, id, "bob", "2", ["1"]);
  const eve = await student(t, id, "eve", "2", ["1"], "NBS");
  const carol = await student(t, id, "carol", "3", ["4"]);
  const dan = await student(t, id, "dan", "4", ["1"]);
  const faye = await student(t, id, "faye", "4", ["1"], "NBS");
  await student(t, id, "grace", "2", ["1"], "CCDS", true);
  await student(t, id, "hank", "2", ["9"]);
  await student(t, semester2, "ivy", "2", ["1"]);
  const result = await asUser(t, "alice").query(api.tasks.getCourseRequestAndMatches, { courseCode: code });
  const participant = (id: string, username: string, index: string) => ({ id, username, index, hasAccepted: false });
  const direct = (id: string, username: string) => ({
    initiator: participant(alice, "alice", "1"), target: participant(id, username, "2"),
    iam: "initiator", isPerfectMatch: true, iHaveWhatTheyWant: true, theyHaveWhatIWant: true,
  });
  const cycle = (id: string, username: string) => ({
    initiator: participant(alice, "alice", "1"), target: participant(carol, "carol", "3"),
    middleman: participant(id, username, "4"), iam: "initiator",
  });
  // Sort only the rows: identities, indexes, role and acceptance are exact contracts.
  expect([...result.directMatches].sort((a, b) => a.target.username.localeCompare(b.target.username)))
    .toEqual(code === "CC0006" ? [direct(bob, "bob")] : [direct(bob, "bob"), direct(eve, "eve")]);
  expect([...result.threeWayCycleMatches].sort((a, b) => a.middleman.username.localeCompare(b.middleman.username)))
    .toEqual(code === "CC0006" ? [cycle(dan, "dan")] : [cycle(dan, "dan"), cycle(faye, "faye")]);
  expect([...result.wantIndexes].sort()).toEqual(["2", "3"]);
});

test("an already-sent ICC three-way request stays visible after its target changes school", async () => {
  // CC0006: Alice 1→2, Bob 2→3, Carol 3→1, all CCDS.
  // - Alice files the request through requestSwap; Bob then changes school to NBS.
  // Expect the already-sent request to remain pending and visible to Alice.
  const t = createBackend();
  const id = await course(t, "CC0006");
  const alice = await student(t, id, "alice", "1", ["2"]);
  const bob = await student(t, id, "bob", "2", ["3"]);
  const carol = await student(t, id, "carol", "3", ["1"]);
  // File while school equality still holds; this is a sent request, not discovery.
  const sent = await asUser(t, "alice").mutation(internal.tasks.requestSwap, {
    targetSwapperId: bob, middlemanSwapperId: carol,
  });
  const pending = sent.requestId;
  expect(await t.run(ctx => ctx.db.get(pending))).toMatchObject({
    _id: pending, courseId: id, initiator: alice, targetSwapper: bob,
    middlemanSwapper: carol, acceptedByInitiator: true,
    acceptedByTargetSwapper: false, acceptedByMiddlemanSwapper: false, isCompleted: false,
  });
  await t.run(async ctx => {
    const s = await ctx.db.get(bob);
    await ctx.db.patch(s!.userId, { school: "NBS" });
  });
  const result = await asUser(t, "alice").query(api.tasks.getCourseRequestAndMatches, { courseCode: "CC0006" });
  // Product contract: school restrictions apply to new matches, retaining sent requests.
  // Observed defect: candidate filtering currently drops this pending cycle entirely.
  expect(result.threeWayCycleMatches).toEqual([{
    initiator: { id: alice, username: "alice", index: "1", hasAccepted: true },
    target: { id: bob, username: "bob", index: "2", hasAccepted: false },
    middleman: { id: carol, username: "carol", index: "3", hasAccepted: false },
    iam: "initiator", status: "pending", requestId: pending, isCompleted: false,
  }]);
});

test("an unsent ICC three-way match disappears after its target changes school", async () => {
  // CC0006: Alice 1→2, Bob 2→3, Carol 3→1, all initially CCDS.
  // - No one files a request; Bob changes school to NBS before sending.
  // Expect no eligible three-way row and no stored swap request.
  const t = createBackend();
  const id = await course(t, "CC0006");
  const alice = await student(t, id, "alice", "1", ["2"]);
  const bob = await student(t, id, "bob", "2", ["3"]);
  const carol = await student(t, id, "carol", "3", ["1"]);
  const before = await asUser(t, "alice").query(api.tasks.getCourseRequestAndMatches, { courseCode: "CC0006" });
  expect(before.threeWayCycleMatches).toEqual([{
    initiator: { id: alice, username: "alice", index: "1", hasAccepted: false },
    target: { id: bob, username: "bob", index: "2", hasAccepted: false },
    middleman: { id: carol, username: "carol", index: "3", hasAccepted: false },
    iam: "initiator",
  }]);
  expect(await t.run(ctx => ctx.db.query("swap_requests").collect())).toEqual([]);
  // Discovery alone creates no request, so current-school eligibility still applies.
  await t.run(async ctx => {
    const s = await ctx.db.get(bob);
    await ctx.db.patch(s!.userId, { school: "NBS" });
  });
  const after = await asUser(t, "alice").query(api.tasks.getCourseRequestAndMatches, { courseCode: "CC0006" });
  expect(after.threeWayCycleMatches).toEqual([]);
  expect(await t.run(ctx => ctx.db.query("swap_requests").collect())).toEqual([]);
});
