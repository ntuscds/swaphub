import { env } from "@/lib/env";

export function convexServerOptions() {
  return {
    url: env.CONVEX_SERVER_URL ?? env.NEXT_PUBLIC_CONVEX_URL,
    skipConvexDeploymentUrlCheck: true,
  } as const;
}
