import { api } from "../../convex/_generated/api";
import { Guard } from "@/components/auth-guard";
import { ScrollArea } from "@/components/ui/scroll-area";
// import { Redirector } from "@/components/auth-guard";
import { fetchQuery } from "convex/nextjs";
import { SwapRequestModal } from "@/components/swap-request-modal";
import { MySwaps } from "@/components/my-swaps";
import { Test } from "@/components/onboard-form";

export default async function Page() {
  const courses = await fetchQuery(api.tasks.getCourses);

  return (
    <Guard>
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
          <SwapRequestModal
            courses={courses.map((course) => ({
              id: course._id,
              code: course.code,
              name: course.name,
            }))}
          />
        </div>
      </main>
    </Guard>
  );
  // return <Redirector />;
  // const { isLoading, isAuthenticated } = useConvexAuth();
  // const self = useQuery(api.tasks.getSelf, isAuthenticated ? {} : "skip");
  // const loadSelf = useMutation(api.tasks.loadSelf);

  // return (
  //   <div className="p-6 flex flex-col gap-4">
  //     <div className="flex items-center gap-3">
  //       <button
  //         className="px-4 py-2 rounded-md bg-white text-black text-sm font-semibold"
  //         onClick={() => loadSelf({})}
  //         disabled={!isAuthenticated}
  //       >
  //         loadSelf
  //       </button>
  //     </div>

  //     {!isAuthenticated && !isLoading && (
  //       <p className="text-sm text-white/70">
  //         Not authenticated with Convex yet. Open this inside Telegram Mini App
  //         (with valid initData) and ensure JWT auth env is configured.
  //       </p>
  //     )}

  //     <pre className="text-xs bg-black/30 border border-white/10 rounded-lg p-4 overflow-auto">
  //       {self?.userId ?? "No self"}
  //       <br />
  //       {isAuthenticated ? "Authenticated" : "Not authenticated"}
  //       <br />
  //       {isLoading ? "Loading" : "Not loading"}
  //       {/* {JSON.stringify({ isLoading, isAuthenticated, self }, null, 2)} */}
  //     </pre>
  //   </div>
  // );
}
