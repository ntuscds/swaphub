"use client";

import { trpc } from "@/server/client";
import { Skeleton } from "./ui/skeleton";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  retrieveRawInitData,
  retrieveRawInitDataFp,
  useRawInitData,
} from "@tma.js/sdk-react";

/**
 * Annoyingly, TMA user info is only accessible in the client side.
 * So we need to check if the user is authenticated in the client side.
 */
export function AuthGuard({
  children,
  verified = true,
}: {
  children: React.ReactNode;
  verified?: boolean;
}) {
  const rawInitData = useRawInitData();
  const user = trpc.user.verifySelf.useQuery();
  const router = useRouter();

  useEffect(() => {
    if (user.isLoading) {
      return;
    }
    // User did not load the app in Telegram.
    if (!rawInitData) {
      router.push("/");
      return;
    }
    // User has yet to onboard.
    if (user.isError || !user.data) {
      router.push("/onboard");
      return;
    }
    // Onboarded, but not verified.
    // if (verified && !user.data?.verifiedAt) {
    //   router.push("/onboard/verify");
    //   return;
    // }
  }, [rawInitData, user.isLoading, user.isError, router, user.data, verified]);

  if (user.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen p-4">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  return children;
}

export function Redirector({ children }: { children?: React.ReactNode }) {
  const user = trpc.user.verifySelf.useQuery();
  const router = useRouter();

  useEffect(() => {
    if (user.isLoading) {
      return;
    }
    // User has yet to onboard.
    if (user.isError || !user.data) {
      router.push("/onboard");
      return;
    }
    // Onboarded, but not verified.
    // if (!user.data?.verifiedAt) {
    //   router.push("/onboard/verify");
    //   return;
    // }

    // Otherwise, we will redirect to the app page.
    router.push("/app");
  }, [user.isLoading, user.isError, router, user.data]);

  // If the user is on telegram, we will use a loader.
  if (user.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen p-4">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  return children;
}
