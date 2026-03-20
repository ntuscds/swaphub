import { CourseSwapMatches } from "@/components/course-swaps";
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
}: {
  params: Promise<{
    courseCode: string;
  }>;
}) {
  const { courseCode } = await params;
  const _course = await db
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

  if (_course.length === 0) {
    notFound();
  }
  const course = _course[0];
  const courseId = course.id;

  const [numberOfSwappers] = await Promise.all([
    db
      .select({
        count: count(),
      })
      .from(swapperTable)
      .where(eq(swapperTable.courseId, courseId)),
  ]);

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
                  <Link href="/app" className="flex items-center gap-0.5">
                    <ArrowLeft className="size-4" /> Back
                  </Link>
                </Button>
                <p className="text-xl font-bold">
                  {course.code} {course.name}
                </p>
                {swappersText && (
                  <Badge variant="secondary">{swappersText}</Badge>
                )}
              </div>

              <CourseSwapMatches
                courseId={courseId}
                name={course.name}
                code={course.code}
              />
            </div>
          </div>
        </div>
      </ScrollArea>
    </main>
  );
}
