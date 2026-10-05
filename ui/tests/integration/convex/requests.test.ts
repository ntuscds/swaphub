import { expect, test } from "vitest";
import { internal } from "../../../convex/_generated/api";
import { asUser, course, createBackend, request, snapshot, student } from "./fixtures";

test("filing a direct request sets initial flags and rejects reverse duplicates", async () => {
  // SC1003: Alice 1→2 and Bob 2→1, no requests yet.
  // - Alice files, repeats; Bob attempts the reverse filing.
  // Expect one pending request with only initiator accepted; rejected filings write nothing.
  const t = createBackend();
  const id = await course(t);
  const alice = await student(t, id, "alice", "1", ["2"]);
  const bob = await student(t, id, "bob", "2", ["1"]);
  const result = await asUser(t, "alice").mutation(internal.tasks.requestSwap, { targetSwapperId: bob });
  const saved = await snapshot(t);
  expect(saved.requests).toEqual([expect.objectContaining({
    _id: result.requestId, courseId: id, initiator: alice, targetSwapper: bob,
    acceptedByInitiator: true, acceptedByTargetSwapper: false,
    acceptedByMiddlemanSwapper: false, isCompleted: false,
  })]);
  // Both directions identify the same active pair.
  for (const [name, target] of [["alice", bob], ["bob", alice]] as const) {
    await expect(asUser(t, name).mutation(internal.tasks.requestSwap, { targetSwapperId: target }))
      .rejects.toThrow("already requested a swap");
    expect(await snapshot(t)).toEqual(saved);
  }
});

test("all role permutations reject a second active three-way request", async () => {
  // SC1003: Alice/Bob/Carol hold 1/2/3 and each wants both other indexes.
  // - Alice files Alice→Bob→Carol, then all six role permutations try filing.
  // Expect one pending request; valid alternate directions cannot duplicate participants.
  const t = createBackend();
  const id = await course(t);
  const alice = await student(t, id, "alice", "1", ["2", "3"]);
  const bob = await student(t, id, "bob", "2", ["1", "3"]);
  const carol = await student(t, id, "carol", "3", ["1", "2"]);
  await asUser(t, "alice").mutation(internal.tasks.requestSwap, { targetSwapperId: bob, middlemanSwapperId: carol });
  const saved = await snapshot(t);
  expect(saved.requests).toEqual([expect.objectContaining({
    courseId: id, initiator: alice, targetSwapper: bob, middlemanSwapper: carol,
    acceptedByInitiator: true, acceptedByTargetSwapper: false,
    acceptedByMiddlemanSwapper: false, isCompleted: false,
  })]);
  // Fully reciprocal wants keep every permutation valid before duplicate checking.
  const permutations = [
    ["alice", bob, carol], ["alice", carol, bob],
    ["bob", alice, carol], ["bob", carol, alice],
    ["carol", alice, bob], ["carol", bob, alice],
  ] as const;
  for (const [name, target, middleman] of permutations) {
    await expect(asUser(t, name).mutation(internal.tasks.requestSwap, {
      targetSwapperId: target, middlemanSwapperId: middleman,
    })).rejects.toThrow("already requested a swap");
    expect(await snapshot(t)).toEqual(saved);
  }
});

test.each(["accept", "decline"] as const)("direct target %s updates flags and preserves unaffected prior requests", async action => {
  // Alice 1→2, Bob 2→1; active Alice/Bob plus Alice/Dan and Bob/Dan requests.
  // - Same-course Eve/Faye request, completed history, and SC1004 request coexist.
  // Expect accept to cancel competing rows and swap Alice/Bob; decline preserves them.
  const t = createBackend();
  const id = await course(t);
  const other = await course(t, "SC1004");
  const alice = await student(t, id, "alice", "1", ["2"]);
  const bob = await student(t, id, "bob", "2", ["1"]);
  const dan = await student(t, id, "dan", "3", ["1", "2"]);
  const eve = await student(t, id, "eve", "4", ["5"]);
  const faye = await student(t, id, "faye", "5", ["4"]);
  const aliceOther = await student(t, other, "alice", "1", ["2"]);
  const danOther = await student(t, other, "dan", "2", ["1"]);
  const active = await request(t, id, alice, bob);
  const competing = [await request(t, id, alice, dan), await request(t, id, dan, bob)];
  const unrelated = await request(t, id, eve, faye);
  const history = await request(t, id, alice, dan, undefined, true);
  const otherRequest = await request(t, other, aliceOther, danOther);
  const before = await snapshot(t);
  const result = await t.mutation(internal.swapRequests.handleSwapRequestDecision, {
    requestId: active, user: { type: "swapper", swapperId: bob }, action,
    shouldMarkAsSwappedIfDecline: false,
  });
  const after = await snapshot(t);
  expect(after.requests.find(r => r._id === active)).toEqual({
    ...before.requests.find(r => r._id === active),
    acceptedByTargetSwapper: action === "accept", isCompleted: true,
  });
  for (const row of after.requests.filter(r => r._id !== active)) {
    // Cancellation changes completion only, leaving acceptance history intact.
    expect(row).toEqual({ ...before.requests.find(r => r._id === row._id),
      isCompleted: action === "accept" && competing.includes(row._id) ? true
        : before.requests.find(r => r._id === row._id)!.isCompleted,
    });
  }
  expect([unrelated, history, otherRequest].map(id => after.requests.find(r => r._id === id)))
    .toEqual([unrelated, history, otherRequest].map(id => before.requests.find(r => r._id === id)));
  expect(after.swappers).toEqual(before.swappers.map(s => ({
    ...s, hasSwapped: action === "accept" && [alice, bob].includes(s._id),
  })));
  expect(after.wants).toEqual(before.wants);
  expect(result.otherDeclineNotifications).toEqual(action === "accept" ? [{
    for: { telegramUserId: before.users.find(u => u.username === "dan")!.telegramUserId },
    reason: "no-longer-swapping",
  }] : []);
  // Terminal replay must reject without changing the finished state.
  await expect(t.mutation(internal.swapRequests.handleSwapRequestDecision, {
    requestId: active, user: { type: "swapper", swapperId: bob }, action,
    shouldMarkAsSwappedIfDecline: false,
  })).rejects.toThrow("already completed");
  expect(await snapshot(t)).toEqual(after);
});

test.each(["target-first", "middleman-first"])("three-way %s keeps partial acceptance pending and completes only after both accept", async order => {
  // SC1003 cycle: Alice 1→2, Bob 2→3, Carol 3→1; Alice already accepted.
  // - Bob then Carol, or Carol then Bob, accepts the pending request.
  // Expect first acceptance to preserve availability; second swaps exactly all three.
  const t = createBackend();
  const id = await course(t);
  const alice = await student(t, id, "alice", "1", ["2"]);
  const bob = await student(t, id, "bob", "2", ["3"]);
  const carol = await student(t, id, "carol", "3", ["1"]);
  const active = await request(t, id, alice, bob, carol);
  const before = await snapshot(t);
  const [first, second] = order === "target-first" ? [bob, carol] : [carol, bob];
  const decide = (swapperId: typeof bob) => t.mutation(internal.swapRequests.handleSwapRequestDecision, {
    requestId: active, user: { type: "swapper" as const, swapperId }, action: "accept" as const,
    shouldMarkAsSwappedIfDecline: false,
  });
  expect((await decide(first)).isCompleted).toBe(false);
  const partial = await snapshot(t);
  expect(partial.requests[0]).toEqual({ ...before.requests[0],
    acceptedByTargetSwapper: first === bob, acceptedByMiddlemanSwapper: first === carol,
  });
  expect(partial.swappers).toEqual(before.swappers);
  // Both orders converge to identical acceptance and availability state.
  expect((await decide(second)).isCompleted).toBe(true);
  const complete = await snapshot(t);
  expect(complete.requests[0]).toEqual({ ...before.requests[0],
    acceptedByTargetSwapper: true, acceptedByMiddlemanSwapper: true, isCompleted: true,
  });
  expect(complete.swappers).toEqual(before.swappers.map(s => ({ ...s, hasSwapped: true })));
  expect(complete.wants).toEqual(before.wants);
});

test.each(["target", "middleman"])("three-way %s can decline after the other recipient has accepted", async role => {
  // SC1003: Alice 1→2, Bob 2→3, Carol 3→1, pending with Alice accepted.
  // - Other recipient accepts first; Bob or Carol declines without disabling.
  // Expect terminal decline retaining prior acceptance; everyone stays available.
  const t = createBackend();
  const id = await course(t);
  const alice = await student(t, id, "alice", "1", ["2"]);
  const bob = await student(t, id, "bob", "2", ["3"]);
  const carol = await student(t, id, "carol", "3", ["1"]);
  const active = await request(t, id, alice, bob, carol);
  const before = await snapshot(t);
  const decline = role === "target" ? bob : carol;
  const accept = role === "target" ? carol : bob;
  for (const [swapperId, action] of [[accept, "accept"], [decline, "decline"]] as const) {
    await t.mutation(internal.swapRequests.handleSwapRequestDecision, {
      requestId: active, user: { type: "swapper", swapperId }, action,
      shouldMarkAsSwappedIfDecline: false,
    });
  }
  const after = await snapshot(t);
  expect(after.requests[0]).toEqual({ ...before.requests[0], isCompleted: true,
    acceptedByTargetSwapper: role === "middleman", acceptedByMiddlemanSwapper: role === "target",
  });
  expect(after.swappers).toEqual(before.swappers);
  expect(after.wants).toEqual(before.wants);
});

test("decline and disable cancels only the actor's active course requests and deduplicates external recipients", async () => {
  // SC1003: Alice/Bob active; Bob is middleman in Dan/Eve/Bob and target in Dan/Bob.
  // - Alice/Dan active, Bob/Dan history, and Bob/Dan SC1004 request coexist.
  // Expect Bob's decline/disable to cancel both competing rows, notify Dan/Eve once.
  const t = createBackend();
  const id = await course(t);
  const other = await course(t, "SC1004");
  const alice = await student(t, id, "alice", "1", ["2"]);
  const bob = await student(t, id, "bob", "2", ["1"]);
  const dan = await student(t, id, "dan", "3", ["2"]);
  const eve = await student(t, id, "eve", "4", ["2"]);
  const bobOther = await student(t, other, "bob", "1", ["2"]);
  const danOther = await student(t, other, "dan", "2", ["1"]);
  const active = await request(t, id, alice, bob);
  const canceled = [active, await request(t, id, dan, eve, bob), await request(t, id, dan, bob)];
  await request(t, id, alice, dan);
  await request(t, id, bob, dan, undefined, true);
  await request(t, other, bobOther, danOther);
  const before = await snapshot(t);
  const result = await t.mutation(internal.swapRequests.handleSwapRequestDecision, {
    requestId: active, user: { type: "user", email: "bob@e.ntu.edu.sg" }, action: "decline",
    shouldMarkAsSwappedIfDecline: true,
  });
  const after = await snapshot(t);
  expect(after.requests).toEqual(before.requests.map(r => ({ ...r,
    isCompleted: canceled.includes(r._id) || r.isCompleted,
  })));
  expect(after.swappers).toEqual(before.swappers.map(s => ({ ...s, hasSwapped: s._id === bob })));
  expect(after.wants).toEqual(before.wants);
  // Dan occurs in two canceled requests but needs only one notification.
  expect(result.otherDeclineNotifications.map(n => n.for.telegramUserId.toString()).sort())
    .toEqual(before.users.filter(u => ["dan", "eve"].includes(u.username)).map(u => u.telegramUserId.toString()).sort());
});

test("toggle disable cancels every participation role; re-enabling preserves preferences and closed history", async () => {
  // Alice holds SC1003 index 1, wants 2; active as initiator, target and middleman.
  // - An unrelated Bob/Carol request and completed Alice/Bob history coexist.
  // Expect disable to close exactly Alice's active rows; re-enable opens no old requests.
  const t = createBackend();
  const id = await course(t);
  const alice = await student(t, id, "alice", "1", ["2"]);
  const bob = await student(t, id, "bob", "2", ["1"]);
  const carol = await student(t, id, "carol", "3", ["1"]);
  const canceled = [await request(t, id, alice, bob), await request(t, id, bob, alice), await request(t, id, bob, carol, alice)];
  await request(t, id, bob, carol);
  await request(t, id, alice, bob, undefined, true);
  const before = await snapshot(t);
  await asUser(t, "alice").mutation(internal.tasks.toggleSwapRequest, { courseCode: "SC1003", hasSwapped: true });
  const disabled = await snapshot(t);
  expect(disabled.requests).toEqual(before.requests.map(r => ({ ...r, isCompleted: canceled.includes(r._id) || r.isCompleted })));
  expect(disabled.swappers).toEqual(before.swappers.map(s => ({ ...s, hasSwapped: s._id === alice })));
  expect(disabled.wants).toEqual(before.wants);
  // Availability can return, but completed requests stay terminal.
  const enabled = await asUser(t, "alice").mutation(internal.tasks.toggleSwapRequest, { courseCode: "SC1003", hasSwapped: false });
  expect(enabled.toDecline).toEqual([]);
  expect(await snapshot(t)).toEqual({ ...disabled, swappers: before.swappers });
});

test("a nonparticipant cannot read or decide a pending request", async () => {
  // SC1003: Alice/Bob pending direct request; Carol has her own swapper in this course.
  // - Carol supplies her swapper ID for both the request query and accept mutation.
  // Expect participant checks to reject and preserve all existing state.
  const t = createBackend();
  const id = await course(t);
  const alice = await student(t, id, "alice", "1", ["2"]);
  const bob = await student(t, id, "bob", "2", ["1"]);
  const carol = await student(t, id, "carol", "3", ["1"]);
  const active = await request(t, id, alice, bob);
  const before = await snapshot(t);
  // These are internal capability boundaries, not public unauthenticated APIs.
  await expect(t.query(internal.swapRequests.getSwapRequestById, { requestId: active, swapperId: carol }))
    .rejects.toThrow("not a participant");
  await expect(t.mutation(internal.swapRequests.handleSwapRequestDecision, {
    requestId: active, user: { type: "swapper", swapperId: carol }, action: "accept",
    shouldMarkAsSwappedIfDecline: false,
  })).rejects.toThrow("not a participant");
  expect(await snapshot(t)).toEqual(before);
});
