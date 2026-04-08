"use client";
import { SwapItemMatchBottomSheet } from "@/components/course-swaps";
import { HydrationSafeScrollArea } from "@/components/hydration-safe-scroll-area";
import { ScrollArea } from "@/components/ui/scroll-area";

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
}
