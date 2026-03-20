"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { httpBatchLink } from "@trpc/react-query";
import { trpc } from "@/server/client";
import { getTrpcUrl } from "@/server/utils";
import { retrieveRawInitData } from "@tma.js/sdk-react";
import superjson from "superjson";
import posthog from "posthog-js";
import { env } from "@/lib/env";

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
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
