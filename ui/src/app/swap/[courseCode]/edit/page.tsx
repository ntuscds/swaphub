import { SwapRequestForm } from "@/components/swap-request";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { db } from "@/db";
import {
  courseIndexTable,
  coursesTable,
  swapperTable,
  swapperWantTable,
} from "@/db/schema";
import { CurrentAcadYear } from "@/lib/acad";
import { and, count, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function RequestPage({
  params,
  searchParams,
}: {
  params: Promise<{
    courseCode: string;
  }>;
  searchParams: Promise<{
    backTo?: string;
  }>;
}) {
  const { courseCode } = await params;
  const { backTo } = await searchParams;
  const course = await db
    .select()
    .from(coursesTable)
    .where(
      and(
        eq(coursesTable.code, courseCode),
        eq(coursesTable.ay, CurrentAcadYear.ay),
        eq(coursesTable.semester, CurrentAcadYear.semester)
      )
    )
    .limit(1);

  if (course.length === 0) {
    notFound();
  }
  const courseId = course[0].id;

  const [courseIndexes, haveCounts, wantCounts, numberOfSwappers] =
    await Promise.all([
      db
        .select()
        .from(courseIndexTable)
        .where(eq(courseIndexTable.courseId, courseId)),
      db
        .select({
          index: swapperTable.index,
          count: count(),
        })
        .from(swapperTable)
        .where(eq(swapperTable.courseId, courseId))
        .groupBy(swapperTable.index),
      db
        .select({
          index: swapperWantTable.wantIndex,
          count: count(),
        })
        .from(swapperWantTable)
        .where(eq(swapperWantTable.courseId, courseId))
        .groupBy(swapperWantTable.wantIndex),
      db
        .select({
          count: count(),
        })
        .from(swapperTable)
        .where(eq(swapperTable.courseId, courseId)),
    ]);

  const haveCountsMap = new Map<string, number>(
    haveCounts.map((count) => [count.index, count.count])
  );

  const wantCountsMap = new Map<string, number>(
    wantCounts.map((count) => [count.index, count.count])
  );

  let swappersText = null;
  if (numberOfSwappers[0].count === 1) {
    swappersText = "1 swapper";
  } else if (numberOfSwappers[0].count > 0) {
    swappersText = `${numberOfSwappers[0].count} swappers`;
  }

  return (
    <main>
      <ScrollArea className="bg-background text-foreground h-screen p-4">
        <div className="flex flex-col items-center">
          <div className="flex flex-col gap-12 py-8 max-w-4xl w-full">
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-2">
                <Button variant="link" className="w-fit px-0">
                  <Link
                    href={backTo ?? "/app"}
                    className="flex items-center gap-0.5"
                  >
                    <ArrowLeft className="size-4" /> Back
                  </Link>
                </Button>
                <p className="text-xl font-bold">
                  {course[0].code} {course[0].name}
                </p>
                {swappersText && (
                  <Badge variant="secondary">{swappersText}</Badge>
                )}
              </div>
              <SwapRequestForm
                courseIndexes={courseIndexes.map((index) => ({
                  id: index.id,
                  index: index.index,
                  haveCount: haveCountsMap.get(index.index) ?? 0,
                  wantCount: wantCountsMap.get(index.index) ?? 0,
                }))}
                courseId={courseId}
              />
            </div>
          </div>
        </div>
      </ScrollArea>
    </main>
  );
}
