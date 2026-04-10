import { HydrationSafeScrollArea } from "@/components/hydration-safe-scroll-area";
import { env } from "@/lib/env";
import { fetchAction } from "convex/nextjs";
import { Suspense } from "react";
import z from "zod";
import { api } from "../../../../convex/_generated/api";
import {
  DirectSwapArtboard,
  ThreeWayCycleArtboard,
} from "@/components/course-swap-artboard";
import { Badge } from "@/components/ui/badge";
import { reduceStatus } from "@/lib/swap-request";

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

    let statusElement: React.ReactNode = null;
    if (request.isCompleted) {
      statusElement =
        request.initiator.hasAccepted &&
        request.target.hasAccepted &&
        (request.middleman === undefined || request.middleman?.hasAccepted) ? (
          <Badge variant="success">Completed</Badge>
        ) : (
          <Badge variant="declined">Declined</Badge>
        );
    } else {
      statusElement = <Badge variant="warning">Pending</Badge>;
    }

    return (
      <div className="flex flex-col gap-2 w-full px-4 py-12">
        <h1 className="w-full text-xl lg:text-2xl font-bold max-w-md">
          {request.course.code} {request.course.name} Swap Request
        </h1>

        <div className="w-full">{statusElement}</div>

        <div className="w-full">
          {request.middleman ? (
            <ThreeWayCycleArtboard
              className="h-80 md:h-88 lg:h-96 xl:h-112 2xl:h-128"
              iam={request.iam}
              initiator={{
                index: request.initiator.index,
                username: request.initiator.username,
                status: reduceStatus(
                  request.initiator.hasAccepted,
                  request.isCompleted
                ),
              }}
              target={{
                index: request.target.index,
                username: request.target.username,
                status: reduceStatus(
                  request.target.hasAccepted,
                  request.isCompleted
                ),
              }}
              middleman={{
                index: request.middleman.index,
                username: request.middleman.username,
                status: reduceStatus(
                  request.middleman.hasAccepted,
                  request.isCompleted
                ),
              }}
            />
          ) : (
            <DirectSwapArtboard
              className="h-44 md:h-52 lg:h-56 xl:h-64 2xl:h-72"
              iam={request.iam === "initiator" ? "initiator" : "target"}
              initiator={{
                index: request.initiator.index,
                username: request.initiator.username,
                status: reduceStatus(
                  request.initiator.hasAccepted,
                  request.isCompleted
                ),
              }}
              target={{
                index: request.target.index,
                username: request.target.username,
                status: reduceStatus(
                  request.target.hasAccepted,
                  request.isCompleted
                ),
              }}
            />
          )}
        </div>
      </div>
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
    <HydrationSafeScrollArea>
      <div className="flex flex-col items-center">
        <div className="flex flex-col gap-2 w-full max-w-4xl">
          <Suspense fallback={<div>Loading...</div>}>
            <Request encryptedPayload={encryptedPayload} />
          </Suspense>
        </div>
      </div>
    </HydrationSafeScrollArea>
  );
}
