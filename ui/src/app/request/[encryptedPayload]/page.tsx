import { HydrationSafeScrollArea } from "@/components/hydration-safe-scroll-area";
import { SwapRequestDecision } from "@/components/swap-request-decision";
import { env } from "@/lib/env";
import { fetchAction } from "convex/nextjs";
import { Suspense } from "react";
import z from "zod";
import { api } from "../../../../convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import Script from "next/script";

export const SwapRequestPayloadSchema = z.object({
  requestId: z.string(),
  swapperId: z.string(),
});

export async function Request({
  encryptedPayload,
}: {
  encryptedPayload: string;
}) {
  try {
    const request = await fetchAction(
      api.actions.getSwapRequestByEncryptedPayload,
      {
        encryptedPayload,
        apiKey: env.API_KEY,
      }
    );
    return (
      <SwapRequestDecision
        request={request}
        encryptedPayload={encryptedPayload}
      />
    );
  } catch (error) {
    console.warn(error);
    return (
      <div className="flex flex-col gap-4 h-screen-safe justify-center items-center w-full">
        <h1 className="text-2xl font-bold">Uh oh! {"):"}</h1>
        <p className="text-sm text-muted-foreground">
          The swap request may no longer be valid.
        </p>
      </div>
    );
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{
    encryptedPayload: string;
  }>;
}) {
  const { encryptedPayload } = await params;
  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      <HydrationSafeScrollArea>
        <div className="flex flex-col items-center">
          <div className="flex flex-col gap-2 w-full max-w-4xl">
            <Suspense fallback={<Skeleton className="w-full h-screen-safe" />}>
              <Request encryptedPayload={encryptedPayload} />
            </Suspense>
          </div>
        </div>
      </HydrationSafeScrollArea>
    </>
  );
}
