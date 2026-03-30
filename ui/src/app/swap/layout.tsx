import { api } from "../../../convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { HydrationSafeScrollArea } from "@/components/hydration-safe-scroll-area";
import { SwapRequestModal } from "@/components/swap-request-modal";
import { MySwaps } from "@/components/my-swaps";
import { Suspense } from "react";
import type { PropsWithChildren } from "react";

export async function SwapRequestModalAsync({ label }: { label?: string }) {
  const courses = await fetchQuery(api.tasks.getCourses, {});
  return (
    <SwapRequestModal
      courses={courses.map((course) => ({
        id: course._id,
        code: course.code,
        name: course.name,
      }))}
      label={label}
    />
  );
}

export default async function Layout({ children }: PropsWithChildren) {
  return (
    <main className="flex flex-col items-center">
      {/* Mobile View */}
      <HydrationSafeScrollArea className="w-full lg:hidden bg-background text-foreground h-screen">
        <div className="w-full p-4">{children}</div>
      </HydrationSafeScrollArea>
      {/* Desktop View */}
      <div className="hidden lg:flex flex-row max-w-ui w-full min-h-0">
        <HydrationSafeScrollArea className="w-full max-w-64 lg:max-w-80 xl:max-w-96 bg-background text-foreground h-screen min-h-0 p-4">
          <div className="w-full max-w-64 lg:max-w-80 xl:max-w-96 flex flex-col gap-2">
            <div className="pt-8 flex flex-row gap-2 items-center justify-between">
              <h1 className="text-sm md:text-base lg:text-lg xl:text-xl text-primary-500">
                My Swaps
              </h1>
              <Suspense
                fallback={<SwapRequestModal courses={[]} label="New" />}
              >
                <SwapRequestModalAsync label="New" />
              </Suspense>
            </div>
            <div className="w-full flex flex-col gap-2">
              <MySwaps className="w-full" />
            </div>
          </div>
        </HydrationSafeScrollArea>
        <HydrationSafeScrollArea className="flex-1 min-h-0 bg-background text-foreground h-screen p-4">
          <div className="w-full flex gap-4 items-center pb-24">
            <div className="w-full">{children}</div>
          </div>
        </HydrationSafeScrollArea>
      </div>

      {/* <div className="lg:hidden fixed bottom-8 right-8">
        <Suspense fallback={<SwapRequestModal courses={[]} />}>
          <SwapRequestModalAsync />
        </Suspense>
      </div> */}
    </main>
  );
}
