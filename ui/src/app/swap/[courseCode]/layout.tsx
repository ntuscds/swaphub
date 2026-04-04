import { PropsWithChildren } from "react";
import { CourseSwapMatches } from "@/components/course-swaps";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AcadYear, CurrentAcadYear } from "@/lib/acad";
import { notFound } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import { cache, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DynBackToButton } from "@/components/dyn-back-to-button";

const loadCourseHeader = cache((courseCode: string, acadYear: AcadYear) =>
  fetchQuery(api.tasks.getCourseHeaderByCode, { courseCode, acadYear })
);

function EditCourseHeaderFallback() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-7 w-3/4 max-w-md" />
      <Skeleton className="h-6 w-24" />
    </div>
  );
}

async function EditCourseHeader({ courseCode }: { courseCode: string }) {
  const data = await loadCourseHeader(courseCode, CurrentAcadYear);
  if (!data) {
    notFound();
  }
  let swappersText: string | null = null;
  if (data.swappersCount === 1) {
    swappersText = "1 swapper";
  } else if (data.swappersCount > 0) {
    swappersText = `${data.swappersCount} swappers`;
  }
  return (
    <>
      <h1 className="text-xl lg:text-2xl xl:text-3xl font-bold">
        {data.code} {data.name}
      </h1>
      {swappersText && <Badge variant="secondary">{swappersText}</Badge>}
    </>
  );
}

export default async function Layout({
  children,
  params,
}: PropsWithChildren & {
  params: Promise<{
    courseCode: string;
  }>;
}) {
  const { courseCode } = await params;

  return (
    <div className="flex flex-col items-center">
      <div className="flex flex-col gap-12 py-8 max-w-4xl w-full">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <div className="flex flex-row gap-2 items-center justify-between">
              <DynBackToButton defaultBackTo="/swap" />
              <div className="flex flex-row gap-2 items-center">
                <Button variant="outline" size="sm">
                  History
                </Button>
                <Button variant="outline" size="sm">
                  Disable
                </Button>
              </div>
            </div>
            <Suspense fallback={<EditCourseHeaderFallback />}>
              <EditCourseHeader courseCode={courseCode} />
            </Suspense>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
