import { SwapItemMatchBottomSheet } from "@/components/course-swaps";
import { HydrationSafeScrollArea } from "@/components/hydration-safe-scroll-area";
import { decryptValue } from "@/lib/encrypt";
import { env } from "@/lib/env";
import z from "zod";

export const SwapRequestPayloadSchema = z.object({
  requestId: z.string(),
  swapperId: z.string(),
});

export default async function Page({
  params,
}: {
  params: Promise<{
    encryptedPayload: string;
  }>;
}) {
  const { encryptedPayload } = await params;
  try {
    const decryptedPayload = await decryptValue(
      encryptedPayload,
      env.ENCRYPTION_KEY
    );
    if (!decryptedPayload) {
      return <div>Invalid payload</div>;
    }

    const payload = SwapRequestPayloadSchema.parse(
      JSON.parse(decryptedPayload)
    );
    return (
      <HydrationSafeScrollArea>
        <div className="flex flex-col items-center">
          <div className="flex flex-col gap-2 w-full max-w-7xl">
            <SwapItemMatchBottomSheet
              isSheet={false}
              course={{
                id: "1" as any,
                haveIndex: "1",
                hasSwapped: false,
                code: "1",
                name: "1",
              }}
              match={{
                type: "direct",
                match: {
                  status: undefined,
                  otherSwapperId: "1" as any,
                  index: "1",
                  isPerfectMatch: false,
                  haveWhatTheyWant: false,
                  haveWhatIWant: false,
                },
              }}
              isAlreadySwapped={false}
              requestClose={() => {}}
            />
          </div>
        </div>
      </HydrationSafeScrollArea>
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
