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
  useRef,
  useState,
} from "react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { ThemeProvider } from "./theme-provider";
import z from "zod";
import { env } from "@/lib/env";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready?: () => void;
        expand?: () => void;
      };
    };
  }
}

const convex = new ConvexReactClient(env.NEXT_PUBLIC_CONVEX_URL);

const ConvexTokenResponseSchema = z.object({
  token: z.string().optional(),
});

function useAuthFromProviderMicrosoft() {
  const refreshTokenQuery = useQuery({
    queryKey: ["refreshToken"],
    queryFn: async () => {
      const res = await fetch("/api/convex/token", {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) return null;
      const data = ConvexTokenResponseSchema.parse(await res.json());
      return data.token ?? null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes. Buffer 5mins to avoid race conditions.
    refetchOnWindowFocus: false,
  });

  const refetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (forceRefreshToken) {
        const result = await refreshTokenQuery.refetch();
        return result.data ?? null;
      }
      return refreshTokenQuery.data ?? null;
    },
    []
  );

  return {
    isLoading: refreshTokenQuery.isLoading,
    isAuthenticated: refreshTokenQuery.data !== null,
    fetchAccessToken: refetchAccessToken,
  };
}

export function Providers({
  children,
  fontClass,
}: {
  children: React.ReactNode;
  fontClass: string;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10 * 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      const webApp = window.Telegram?.WebApp;
      if (!webApp) {
        alert("No Telegram WebApp");
        return;
      }

      try {
        webApp.ready?.();
        webApp.expand?.();
        alert("Telegram WebApp initialized");
      } catch (error) {
        alert(error);
      }
    }, 100);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ConvexProviderWithAuth
        client={convex}
        useAuth={useAuthFromProviderMicrosoft}
      >
        <QueryClientProvider client={queryClient}>
          {/* <SelfProvider>{children}</SelfProvider> */}
          <ThemeProvider className={fontClass}>{children}</ThemeProvider>
        </QueryClientProvider>
      </ConvexProviderWithAuth>
    </QueryClientProvider>
  );
}
