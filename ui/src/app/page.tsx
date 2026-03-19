"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function Page() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const self = useQuery(api.tasks.getSelf, isAuthenticated ? {} : "skip");
  const loadSelf = useMutation(api.tasks.loadSelf);

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button
          className="px-4 py-2 rounded-md bg-white text-black text-sm font-semibold"
          onClick={() => loadSelf({})}
          disabled={!isAuthenticated}
        >
          loadSelf
        </button>
      </div>

      {!isAuthenticated && !isLoading && (
        <p className="text-sm text-white/70">
          Not authenticated with Convex yet. Open this inside Telegram Mini App
          (with valid initData) and ensure JWT auth env is configured.
        </p>
      )}

      <pre className="text-xs bg-black/30 border border-white/10 rounded-lg p-4 overflow-auto">
        {JSON.stringify(
          { isLoading, isAuthenticated, self },
          null,
          2
        )}
      </pre>
    </div>
  );
}
