import { Id } from "../../convex/_generated/dataModel";

export const COMMAND_PREFIX = {
  ACCEPT: "a",
  DECLINE: "d",
};

export function serializeAccept(
  myUserId: Id<"users">,
  initiator: Id<"swapper">,
  targetSwapper: Id<"swapper">,
  middlemanSwapper?: Id<"swapper"> | null
) {
  const id = Math.floor(Math.random() * 1000000).toString(16);
  if (middlemanSwapper) {
    return `${COMMAND_PREFIX.ACCEPT}:${id}:${myUserId}:${initiator}:${targetSwapper}:${middlemanSwapper}`;
  }
  return `${COMMAND_PREFIX.ACCEPT}:${id}:${myUserId}:${initiator}:${targetSwapper}`;
}

export function serializeDecline(
  myUserId: Id<"users">,
  initiator: Id<"swapper">,
  targetSwapper: Id<"swapper">,
  middlemanSwapper?: Id<"swapper"> | null
) {
  const id = Math.floor(Math.random() * 1000000).toString(16);
  if (middlemanSwapper) {
    return `${COMMAND_PREFIX.DECLINE}:${id}:${myUserId}:${initiator}:${targetSwapper}:${middlemanSwapper}`;
  }
  return `${COMMAND_PREFIX.DECLINE}:${id}:${myUserId}:${initiator}:${targetSwapper}`;
}

export function getAction(data: string) {
  const parts = data.split(":");
  if (parts.length < 2) return null;
  const [action, id] = parts;
  return { action, id };
}

export function deserializeAccept(data: string) {
  const parts = data.split(":");
  if (parts.length === 6) {
    const [
      actionChar,
      id,
      myUserIdStr,
      initiatorStr,
      targetSwapperStr,
      middlemanSwapperStr,
    ] = parts;
    if (actionChar !== COMMAND_PREFIX.ACCEPT) return null;
    return {
      id,
      myUserId: myUserIdStr as Id<"users">,
      initiator: initiatorStr as Id<"swapper">,
      targetSwapper: targetSwapperStr as Id<"swapper">,
      middlemanSwapper: middlemanSwapperStr as Id<"swapper"> | null,
    };
  }
  if (parts.length === 5) {
    const [actionChar, id, myUserIdStr, initiatorStr, targetSwapperStr] = parts;
    if (actionChar !== COMMAND_PREFIX.ACCEPT) return null;
    return {
      id,
      myUserId: myUserIdStr as Id<"users">,
      initiator: initiatorStr as Id<"swapper">,
      targetSwapper: targetSwapperStr as Id<"swapper">,
    };
  }
  return null;
}

export function deserializeDecline(data: string) {
  const parts = data.split(":");
  if (parts.length === 6) {
    const [
      actionChar,
      id,
      myUserId,
      initiatorStr,
      targetSwapperStr,
      middlemanSwapperStr,
    ] = parts;
    if (actionChar !== COMMAND_PREFIX.DECLINE) return null;
    return {
      id,
      myUserId: myUserId as Id<"users">,
      initiator: initiatorStr as Id<"swapper">,
      targetSwapper: targetSwapperStr as Id<"swapper">,
      middlemanSwapper: middlemanSwapperStr as Id<"swapper"> | null,
    };
  }
  if (parts.length === 5) {
    const [actionChar, id, myUserIdStr, initiatorStr, targetSwapperStr] = parts;
    if (actionChar !== COMMAND_PREFIX.DECLINE) return null;
    return {
      id,
      myUserId: myUserIdStr as Id<"users">,
      initiator: initiatorStr as Id<"swapper">,
      targetSwapper: targetSwapperStr as Id<"swapper">,
    };
  }
  return null;
}
