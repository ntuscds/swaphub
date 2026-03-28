"use client";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { useStableQuery } from "./use-stable-query";
import { api } from "../../convex/_generated/api";

const queryClient = new QueryClient();
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const SelfContext = createContext<{
  self: Awaited<
    ReturnType<typeof useStableQuery<typeof api.tasks.getSelf>>
  > | null;
}>({
  self: null,
});

export function useSelf() {
  return useContext(SelfContext);
}

// export function SelfProvider({ children }: { children: React.ReactNode }) {
//   const self = useStableQuery(api.tasks.getSelf);
//   return (
//     <SelfContext.Provider value={{ self }}>{children}</SelfContext.Provider>
//   );
// }

function useAuthFromProviderMicrosoft() {
  const refreshTokenQuery = useQuery({
    queryKey: ["refreshToken"],
    queryFn: async () => {
      const res = await fetch("/api/convex/token", {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { token?: string };
      return data.token ?? null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const refetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      const result = await refreshTokenQuery.refetch({});
      return result.data ?? null;
      // if (typeof window === "undefined") {
      //   return null;
      // }

      // try {
      //   const res = await fetch("/api/convex/token", {
      //     method: "GET",
      //     cache: forceRefreshToken ? "no-store" : "default",
      //   });
      //   if (!res.ok) return null;
      //   const data = (await res.json()) as { token?: string };
      //   return data.token ?? null;
      // } catch {
      //   return null;
      // }
    },
    []
  );

  // useEffect(() => {
  //   console.log("refetchAccessToken");
  //   // void refetchAccessToken({ forceRefreshToken: false });
  // }, [refetchAccessToken]);

  return {
    isLoading: refreshTokenQuery.isLoading,
    isAuthenticated: refreshTokenQuery.data !== null,
    fetchAccessToken: refetchAccessToken,
  };
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ConvexProviderWithAuth
        client={convex}
        useAuth={useAuthFromProviderMicrosoft}
      >
        <QueryClientProvider client={queryClient}>
          {/* <SelfProvider>{children}</SelfProvider> */}
          {children}
        </QueryClientProvider>
      </ConvexProviderWithAuth>
    </QueryClientProvider>
  );
}
