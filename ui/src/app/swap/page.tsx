import { api } from "../../../convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { SwapRequestModal } from "@/components/swap-request-modal";
import { MySwaps } from "@/components/my-swaps";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/microsoft-auth";
import Image from "next/image";

export async function SwapRequestModalAsync({ label }: { label?: string }) {
  const courses = await fetchQuery(api.tasks.getCourses, {});
  return (
    <SwapRequestModal
      courses={courses.map((course) => ({
        id: course.id,
        code: course.code,
        name: course.name,
      }))}
      label={label}
    />
  );
}

export default async function Page() {
  const auth = await getAuth();
  if (!auth?.email) {
    redirect("/onboard");
  }
  return (
    <>
      {/* Mobile View */}
      <div className="lg:hidden flex flex-col gap-4 items-center pb-24">
        <div className="flex flex-col gap-4 pt-8 max-w-4xl w-full">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-bold text-primary-700 dark:text-primary-400">
              My Swaps
            </h1>
          </div>
          <MySwaps />
        </div>
      </div>
      <div className="lg:hidden fixed bottom-12 right-8">
        <Suspense fallback={<SwapRequestModal courses={[]} />}>
          <SwapRequestModalAsync />
        </Suspense>
      </div>
      {/* Desktop View */}
      <div className="py-4">
        <div className="hidden lg:flex flex-col gap-8 h-fit p-12 items-center justify-center flex-1 border border-border rounded-md bg-card">
          <div className="relative w-full aspect-607/463 max-w-sm">
            <Image
              src="/no-course-selected.png"
              alt="No Course Selected"
              fill
              className="object-contain"
            />
          </div>
          <div className="flex flex-col xl:gap-1 items-center justify-center">
            <h2 className="text-lg lg:text-xl xl:text-2xl text-primary-700 dark:text-primary-400">
              No Course Selected
            </h2>
            <p className="text-sm lg:text-base xl:text-lg text-muted-foreground">
              Please select a course to view its swaps.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
