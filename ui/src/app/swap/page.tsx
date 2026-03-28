import { api } from "../../../convex/_generated/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchQuery } from "convex/nextjs";
import { SwapRequestModal } from "@/components/swap-request-modal";
import { MySwaps } from "@/components/my-swaps";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/microsoft-auth";

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
            <h1 className="text-xl font-bold text-primary-500">My Swaps</h1>
          </div>
          <MySwaps />
        </div>
      </div>
      <div className="lg:hidden fixed bottom-8 right-8">
        <Suspense fallback={<SwapRequestModal courses={[]} />}>
          <SwapRequestModalAsync />
        </Suspense>
      </div>
      {/* Desktop View */}
      <div className="hidden lg:flex flex-col xl:gap-1 h-64 p-20 items-center justify-center flex-1 border border-border rounded-md bg-card">
        <h2 className="text-lg lg:text-xl xl:text-2xl text-primary-500">
          No Course Selected
        </h2>
        <p className="text-sm lg:text-base xl:text-lg text-muted-foreground">
          Please select a course to view its swaps.
        </p>
      </div>
    </>
  );
  // return (
  //   <main>
  //     <ScrollArea className="bg-background text-foreground h-screen p-4">
  //       {/* Mobile View */}
  //       <div className="lg:hidden flex flex-col gap-4 items-center pb-24">
  //         <div className="flex flex-col gap-4 pt-8 max-w-4xl w-full">
  //           <div className="flex flex-col gap-2">
  //             <h1 className="text-xl font-bold text-primary-500">My Swaps</h1>
  //           </div>
  //           <MySwaps />
  //         </div>
  //       </div>
  //       {/* Desktop View */}
  //       <div className="hidden lg:flex flex-col gap-4 items-center pb-24">
  //         <div className="flex flex-row gap-4 pt-8 max-w-ui w-full">
  //           <div className="w-full max-w-64 lg:max-w-80 xl:max-w-96 flex flex-col gap-2">
  //             <div className="flex flex-row gap-2 items-center justify-between">
  //               <h1 className="text-sm md:text-base lg:text-lg xl:text-xl text-primary-500">
  //                 My Swaps
  //               </h1>
  //               <Suspense
  //                 fallback={<SwapRequestModal courses={[]} label="New" />}
  //               >
  //                 <SwapRequestModalAsync label="New" />
  //               </Suspense>
  //             </div>
  //             <div className="w-full flex flex-col gap-2">
  //               <MySwaps className="w-full" />
  //             </div>
  //           </div>
  //           <div className="flex flex-col xl:gap-1 h-64 p-20 items-center justify-center flex-1 border border-border rounded-md bg-card">
  //             <h2 className="text-lg lg:text-xl xl:text-2xl text-primary-500">
  //               No Course Selected
  //             </h2>
  //             <p className="text-sm lg:text-base xl:text-lg text-muted-foreground">
  //               Please select a course to view its swaps.
  //             </p>
  //           </div>
  //         </div>
  //       </div>
  //     </ScrollArea>
  //     <div className="lg:hidden fixed bottom-8 right-8">
  //       <Suspense fallback={<SwapRequestModal courses={[]} />}>
  //         <SwapRequestModalAsync />
  //       </Suspense>
  //     </div>
  //   </main>
  // );
}
