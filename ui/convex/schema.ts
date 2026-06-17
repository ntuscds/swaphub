import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const programType = v.union(v.literal("full_time"), v.literal("part_time"));

export default defineSchema({
  programs: defineTable({
    name: v.string(),
    code: v.string(),
    subCode: v.optional(v.string()),
    year: v.optional(v.number()),
    type: programType,
  }).index("by_code_subCode_year", ["code", "subCode", "year"]),

  courses: defineTable({
    code: v.string(),
    name: v.string(),
    au: v.number(),
    ay: v.string(),
    semester: v.string(),
    // Store a plain string instead of a Postgres tsvector.
    searchText: v.string(),
    isAvailableUE: v.boolean(),
    isAvailableBD: v.boolean(),
    isAvailableGEPE: v.boolean(),
    isSelfPaced: v.boolean(),
  })
    .index("by_code_ay_semester", ["code", "ay", "semester"])
    .searchIndex("search_text", {
      searchField: "searchText",
      filterFields: ["code", "ay", "semester"],
    }),

  course_index: defineTable({
    index: v.string(),
    courseId: v.id("courses"),
  })
    .index("by_index_courseId", ["index", "courseId"])
    .index("by_courseId", ["courseId"]),

  // FIndex swap / matching tables
  users: defineTable({
    handle: v.string(),
    username: v.string(),
    telegramUserId: v.int64(),
    email: v.string(),
    school: v.string(),
  })
    .index("by_handle", ["handle"])
    .index("by_email", ["email"])
    .index("by_username", ["username"]),

  // Telegram user verification
  telegram_user_verification: defineTable({
    email: v.string(),
    code: v.string(),
  }).index("by_email", ["email"]),

  // FIndex swap / matching tables
  swapper: defineTable({
    userId: v.id("users"),
    courseId: v.id("courses"),
    index: v.string(),
    hasSwapped: v.boolean(),
  })
    .index("by_userId_courseId", ["userId", "courseId"])
    .index("by_courseId_index", ["courseId", "index"])
    .index("by_courseId", ["courseId"])
    .index("by_userId", ["userId"]),

  swapper_wants: defineTable({
    swapperId: v.id("swapper"),
    wantIndex: v.string(),
    requestedAt: v.optional(v.number()), // ms since epoch
  }).index("by_swapperId", ["swapperId"]),

  swap_requests: defineTable({
    courseId: v.id("courses"),
    initiator: v.id("swapper"),
    targetSwapper: v.id("swapper"),
    middlemanSwapper: v.optional(v.id("swapper")),
    acceptedByInitiator: v.boolean(),
    acceptedByTargetSwapper: v.boolean(),
    acceptedByMiddlemanSwapper: v.boolean(),
    isCompleted: v.boolean(),
  })
    .index("by_courseId_initiator_targetSwapper_middlemanSwapper", [
      "courseId",
      "initiator",
      "targetSwapper",
      "middlemanSwapper",
    ])
    .index("by_courseId", ["courseId"])
    .index("by_initiator", ["initiator"]),

  telegram_callback_data: defineTable({
    callbackData: v.string(),
  }),
});
