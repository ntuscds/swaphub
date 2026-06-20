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
import { retrieveRawInitData } from "@tma.js/sdk-react";
import Script from "next/script";
import posthog from "posthog-js";

type TelegramSafeAreaInset = {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
};

type TelegramWebApp = {
  ready?: () => void;
  expand?: () => void;
  contentSafeAreaInset?: TelegramSafeAreaInset;
  safeAreaInset?: TelegramSafeAreaInset;
  onEvent?: (event: string, handler: () => void) => void;
  offEvent?: (event: string, handler: () => void) => void;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

// function applyTelegramSafeArea() {
//   if (typeof window === "undefined") return;
//   const webApp = window.Telegram?.WebApp;
//   if (!webApp) return;
//   const top =
//     webApp.contentSafeAreaInset?.top ?? webApp.safeAreaInset?.top ?? 0;
//   const bottom =
//     webApp.contentSafeAreaInset?.bottom ?? webApp.safeAreaInset?.bottom ?? 0;
//   const left =
//     webApp.contentSafeAreaInset?.left ?? webApp.safeAreaInset?.left ?? 0;
//   const right =
//     webApp.contentSafeAreaInset?.right ?? webApp.safeAreaInset?.right ?? 0;
//   const root = document.documentElement;
//   root.style.setProperty("--safe-top", `${top}px`);
//   root.style.setProperty("--safe-bottom", `${bottom}px`);
//   root.style.setProperty("--safe-left", `${left}px`);
//   root.style.setProperty("--safe-right", `${right}px`);
// }

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
  user,
}: {
  children: React.ReactNode;
  user?: {
    id: string;
    email: string;
    name: string;
  };
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
    if (typeof window === "undefined") return;
    // Route PostHog through the Next.js rewrite proxy configured in
    // next.config.ts (see `/relay-AQvm/*`) so requests aren't blocked by
    // ad/tracker blockers.
    posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: "/relay-AQvm",
      ui_host: env.NEXT_PUBLIC_POSTHOG_HOST,
      defaults: "2025-11-30",
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    posthog.identify(user.id, {
      email: user.email,
      name: user.name,
    });
  }, [user]);

  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="lazyOnload"
        onLoad={() => {
          const webApp = window.Telegram?.WebApp;
          if (!webApp) {
            return;
          }

          try {
            webApp.ready?.();
            webApp.expand?.();
          } catch (error) {}

          // applyTelegramSafeArea();
          // webApp.onEvent?.("safe_area_changed", applyTelegramSafeArea);
          // webApp.onEvent?.(
          //   "content_safe_area_changed",
          //   applyTelegramSafeArea
          // );
        }}
        // strategy="beforeInteractive"
      />
      <QueryClientProvider client={queryClient}>
        <ConvexProviderWithAuth
          client={convex}
          useAuth={useAuthFromProviderMicrosoft}
        >
          <QueryClientProvider client={queryClient}>
            {/* <SelfProvider>{children}</SelfProvider> */}
            <ThemeProvider>{children}</ThemeProvider>
          </QueryClientProvider>
        </ConvexProviderWithAuth>
      </QueryClientProvider>
    </>
  );
}
