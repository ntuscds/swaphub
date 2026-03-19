"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { httpBatchLink } from "@trpc/react-query";
import { trpc } from "@/server/client";
import { getTrpcUrl } from "@/server/utils";
import { retrieveRawInitData } from "@tma.js/sdk-react";
import superjson from "superjson";
import posthog from "posthog-js";
import { env } from "@/lib/env";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function useAuthFromProviderTelegram() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Next.js will render this component on the server too; guard window access.
    if (typeof window === "undefined") return;
    setIsAuthenticated(Boolean(retrieveRawInitData()));
  }, []);

  return useMemo(() => {
    return {
      isLoading: false,
      isAuthenticated,
      fetchAccessToken: async ({
        forceRefreshToken,
      }: {
        forceRefreshToken: boolean;
      }) => {
        if (typeof window === "undefined") {
          return null;
        }
        const rawInitData = retrieveRawInitData();
        if (!rawInitData) return null;

        const res = await fetch("/api/convex/token", {
          method: "GET",
          headers: { Authorization: rawInitData },
          cache: forceRefreshToken ? "no-store" : "default",
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { token?: string };
        return data.token ?? null;
      },
    };
  }, [isAuthenticated]);
  // const params = new URLSearchParams(rawInitData);
  // const userJson = params.get("user");
  // if (typeof userJson === "string") {
  //   const user = JSON.parse(userJson);
  //   return user;
  // }
  // return useMemo(
  //   () => ({
  //     // Whether the auth provider is in a loading state
  //     isLoading: isLoading,
  //     // Whether the auth provider has the user signed in
  //     isAuthenticated: isAuthenticated ?? false,
  //     // The async function to fetch the ID token
  //     fetchAccessToken,
  //   }),
  //   [isLoading, isAuthenticated, fetchAccessToken],
  // );
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

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: getTrpcUrl(),
          transformer: superjson,
          headers: () => {
            const rawInitData = retrieveRawInitData();
            return {
              ...(rawInitData && { Authorization: rawInitData }),
            };
          },
        }),
      ],
    })
  );

  useEffect(() => {
    const initDataRaw = retrieveRawInitData();

    // The 'user' parameter is a JSON string of the WebAppUser object

    if (initDataRaw) {
      const params = new URLSearchParams(initDataRaw);
      const userJson = params.get("user");
      if (typeof userJson === "string") {
        const user = JSON.parse(userJson);
        const userId = user.id;
        const userName = user.username;
        posthog.identify(userId, {
          username: userName,
        });
      }
    }
    posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
      // api_host: env.NEXT_PUBLIC_POSTHOG_HOST,
      api_host: "/relay-AQvm",
      ui_host: env.NEXT_PUBLIC_POSTHOG_HOST,
      // person_profiles:
      // person_profiles: "always", // or 'always' to create profiles for anonymous users as well
      defaults: "2025-11-30",
    });
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      {/* <SessionProvider
        basePath="/api/auth"
        refetchInterval={5 * 60}
        refetchOnWindowFocus={true}
      >
        
      </SessionProvider> */}
      <ConvexProviderWithAuth
        client={convex}
        useAuth={useAuthFromProviderTelegram}
      >
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </ConvexProviderWithAuth>
    </trpc.Provider>
  );
}
