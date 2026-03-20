import { SwapRequestModal } from "@/components/swap-request-modal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { db } from "@/db";
import { coursesTable } from "@/db/schema";
import { CurrentAcadYear } from "@/lib/acad";
import { and, eq } from "drizzle-orm";
import { MySwaps } from "@/components/my-swaps";

export default async function AppPage() {
  const courses = await db
    .select({
      id: coursesTable.id,
      code: coursesTable.code,
      name: coursesTable.name,
    })
    .from(coursesTable)
    .where(
      and(
        eq(coursesTable.ay, CurrentAcadYear.ay),
        eq(coursesTable.semester, CurrentAcadYear.semester)
      )
    );

  return (
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
        <SwapRequestModal courses={courses} />
      </div>
    </main>
  );
}
