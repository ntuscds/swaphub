import { Id } from "../../convex/_generated/dataModel";

export const COMMAND_PREFIX = {
  ACCEPT: "a",
  ALREADY_SWAPPED: "s",
};

export function serializeAccept(
  courseId: Id<"courses">,
  swapper1: Id<"swapper">,
  swapper2: Id<"swapper">
) {
  const id = Math.floor(Math.random() * 1000000).toString(16);
  const data = `${COMMAND_PREFIX.ACCEPT}:${id}:${courseId}:${swapper1}:${swapper2}`;
  return data;
}

export function serializeAlreadySwapped(
  courseId: Id<"courses">,
  swapper1: Id<"swapper">,
  swapper2: Id<"swapper">
) {
  const id = Math.floor(Math.random() * 1000000).toString(16);
  const data = `${COMMAND_PREFIX.ALREADY_SWAPPED}:${id}:${courseId}:${swapper1}:${swapper2}`;
  return data;
}

export function getAction(data: string) {
  const parts = data.split(":");
  if (parts.length < 2) return null;
  const [action, id] = parts;
  return { action, id };
}

export function deserializeAccept(data: string) {
  const parts = data.split(":");
  if (parts.length !== 5) return null;
  const [actionChar, id, courseIdStr, swapper1Str, swapper2Str] = parts;
  if (actionChar !== "a") return null;
  return {
    id,
    courseId: courseIdStr as Id<"courses">,
    swapper1: swapper1Str as Id<"swapper">,
    swapper2: swapper2Str as Id<"swapper">,
  };
}

export function deserializeAlreadySwapped(data: string) {
  const parts = data.split(":");
  if (parts.length !== 5) return null;
  const [actionChar, id, courseIdStr, swapper1Str, swapper2Str] = parts;
  if (actionChar !== "s") return null;
  return {
    id,
    courseId: courseIdStr as Id<"courses">,
    swapper1: swapper1Str as Id<"swapper">,
    swapper2: swapper2Str as Id<"swapper">,
  };
}
