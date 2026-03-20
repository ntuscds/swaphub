import { SwapRequestFormWithPrefill } from "@/components/swap-request";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "../../../../../convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";

const loadCourseHeader = cache((courseCode: string) =>
  fetchQuery(api.tasks.getCourseHeaderByCode, { courseCode })
);

async function EditCourseHeader({ courseCode }: { courseCode: string }) {
  const data = await loadCourseHeader(courseCode);
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
      <p className="text-xl font-bold">
        {data.code} {data.name}
      </p>
      {swappersText && <Badge variant="secondary">{swappersText}</Badge>}
    </>
  );
}

function EditCourseHeaderFallback() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-7 w-3/4 max-w-md" />
      <Skeleton className="h-6 w-24" />
    </div>
  );
}

async function EditCourseFormSection({ courseCode }: { courseCode: string }) {
  const header = await loadCourseHeader(courseCode);
  if (!header) {
    notFound();
  }
  const indexes = await fetchQuery(api.tasks.getCourseIndexesForEdit, {
    courseId: header.courseId,
  });
  return (
    <SwapRequestFormWithPrefill
      courseId={header.courseId}
      courseIndexes={indexes}
    />
  );
}

function EditCourseFormFallback() {
  return <Skeleton className="h-48 w-full" />;
}

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

  return (
    <main>
      <ScrollArea className="bg-background text-foreground h-screen p-4">
        <div className="flex flex-col items-center">
          <div className="flex flex-col gap-12 py-8 max-w-4xl w-full">
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-2">
                <Button variant="link" className="w-fit px-0">
                  <Link
                    href={backTo ?? "/"}
                    className="flex items-center gap-0.5"
                  >
                    <ArrowLeft className="size-4" /> Back
                  </Link>
                </Button>
                <Suspense fallback={<EditCourseHeaderFallback />}>
                  <EditCourseHeader courseCode={courseCode} />
                </Suspense>
              </div>
              <Suspense fallback={<EditCourseFormFallback />}>
                <EditCourseFormSection courseCode={courseCode} />
              </Suspense>
            </div>
          </div>
        </div>
      </ScrollArea>
    </main>
  );
}
