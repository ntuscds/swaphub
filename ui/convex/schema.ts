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

  course_index_sources: defineTable({
    indexId: v.id("course_index"),
    source: v.id("programs"),
  }).index("by_indexId_source", ["indexId", "source"]),

  course_index_classes: defineTable({
    indexId: v.id("course_index"),
    timeFromHour: v.number(),
    timeFromMinute: v.number(),
    timeToHour: v.number(),
    timeToMinute: v.number(),
    venue: v.string(),
    day: v.number(),
    type: v.string(),
    remarks: v.string(),
    weeks: v.array(v.number()),
  }).index("by_indexId", ["indexId"]),

  campuses: defineTable({
    name: v.string(),
    mazeMapCampusId: v.number(),
  }).index("by_name", ["name"]),

  locations: defineTable({
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    building: v.optional(v.string()),
    floorName: v.optional(v.string()),
    campusId: v.id("campuses"),
    latitude: v.number(),
    longitude: v.number(),
    z: v.optional(v.number()),
    mazeMapPoiId: v.number(),
    mazeMapIdentifier: v.optional(v.string()),
  })
    .index("by_campusId", ["campusId"])
    .index("by_mazeMapPoiId", ["mazeMapPoiId"]),

  location_types: defineTable({
    name: v.string(),
  }).index("by_name", ["name"]),

  location_type_locations: defineTable({
    locationId: v.id("locations"),
    typeId: v.id("location_types"),
  }).index("by_locationId_typeId", ["locationId", "typeId"]),

  location_images: defineTable({
    locationId: v.id("locations"),
    imageUrl: v.string(),
  }).index("by_locationId_imageUrl", ["locationId", "imageUrl"]),

  location_alt_names: defineTable({
    locationId: v.id("locations"),
    altName: v.string(),
  })
    .index("by_locationId", ["locationId"])
    .index("by_altName", ["altName"]),

  // FIndex swap / matching tables
  users: defineTable({
    userId: v.int64(),
    handle: v.string(),
    school: v.string(),
    // joinDate: v.optional(v.number()), // ms since epoch
  })
    .index("by_handle", ["handle"])
    .index("by_userId", ["userId"]),

  // FIndex swap / matching tables
  swapper: defineTable({
    telegramUserId: v.int64(),
    // userId: v.id("users"),
    courseId: v.id("courses"),
    index: v.string(),
    hasSwapped: v.boolean(),
    previouslyMatchedWith: v.optional(v.id("swapper")),
  })
    .index("by_telegramUserId_courseId", ["telegramUserId", "courseId"])
    .index("by_courseId_index", ["courseId", "index"])
    .index("by_courseId", ["courseId"])
    .index("by_telegramUserId", ["telegramUserId"]),

  swapper_wants: defineTable({
    swapperId: v.id("swapper"),
    wantIndex: v.string(),
    requestedAt: v.optional(v.number()), // ms since epoch
  }).index("by_swapperId", ["swapperId"]),

  swap_requests: defineTable({
    courseId: v.id("courses"),
    swapper1: v.id("swapper"),
    swapper2: v.id("swapper"),
    initiator: v.id("swapper"),
    requestedAt: v.optional(v.number()), // ms since epoch
  })
    .index("by_course_swapper_pair", ["courseId", "swapper1", "swapper2"])
    .index("by_courseId", ["courseId"])
    .index("by_initiator", ["initiator"]),

  telegram_callback_data: defineTable({
    callbackData: v.string(),
  }),
});
