import { api } from "../../convex/_generated/api";
import { AuthGuard } from "@/components/auth-guard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchQuery } from "convex/nextjs";
import { SwapRequestModal } from "@/components/swap-request-modal";
import { MySwaps } from "@/components/my-swaps";
import { Suspense } from "react";

export async function SwapRequestModalAsync() {
  const courses = await fetchQuery(api.tasks.getCourses, {});
  return (
    <SwapRequestModal
      courses={courses.map((course) => ({
        id: course._id,
        code: course.code,
        name: course.name,
      }))}
    />
  );
}

export default async function Page() {
  return (
    <AuthGuard>
      <main>
        <ScrollArea className="bg-background text-foreground h-screen p-4">
          <div className="flex flex-col gap-4 items-center pb-24">
            <div className="flex flex-col gap-12 pt-8 max-w-4xl w-full">
              <div className="flex flex-col gap-2">
                <h1 className="text-xl font-bold">My Swaps</h1>
              </div>
            </div>
            <MySwaps />
          </div>
        </ScrollArea>
        <div className="fixed bottom-8 right-8">
          <Suspense fallback={<SwapRequestModal courses={[]} />}>
            <SwapRequestModalAsync />
          </Suspense>
        </div>
      </main>
    </AuthGuard>
  );
}
