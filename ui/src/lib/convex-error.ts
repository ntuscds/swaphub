import { ConvexError } from "convex/values";

/**
 * Extracts a user-facing message from a Convex mutation/action error.
 * Application errors thrown as `ConvexError` carry the display text in `data`,
 * while `message` includes dev-only request metadata and stack traces.
 */
export function getConvexErrorMessage(
  err: unknown,
  fallback = "Request failed"
): string {
  if (err instanceof ConvexError) {
    const { data } = err;
    if (typeof data === "string") {
      return data;
    }
    if (
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof data.message === "string"
    ) {
      return data.message;
    }
    return fallback;
  }

  if (err instanceof Error) {
    return err.message;
  }

  return String(err ?? fallback);
}
