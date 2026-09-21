import { Lock } from "@upstash/lock";
import { env } from "@/lib/env-convex";
import { redis } from "@/db/upstash";

const heldLocks = new Map<string, symbol>();

export function createLock(id: string, lease = 5000) {
  if (env.BOT_KEY !== "e2e-telegram-token") return new Lock({ id, lease, redis });
  const owner = Symbol(id);
  return {
    async acquire() {
      if (heldLocks.has(id)) return false;
      heldLocks.set(id, owner);
      return true;
    },
    async release() {
      if (heldLocks.get(id) === owner) heldLocks.delete(id);
    },
  };
}
