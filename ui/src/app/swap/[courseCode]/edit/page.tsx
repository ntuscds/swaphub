import { SwapRequestFormWithPrefill } from "@/components/swap-request";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "../../../../../convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cache, Suspense } from "react";
import { getAuth } from "@/lib/microsoft-auth";
import { CurrentAcadYear } from "@/lib/acad";

async function EditCourseFormSection({ courseCode }: { courseCode: string }) {
  const indexes = await fetchQuery(api.tasks.getCourseIndexesForEdit, {
    courseCode,
    acadYear: CurrentAcadYear,
  });
  return (
    <SwapRequestFormWithPrefill
      courseId={indexes.course.id}
      courseIndexes={indexes.indexes}
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

  const auth = await getAuth();
  if (!auth?.email) {
    redirect("/onboard");
  }

  return (
    <Suspense fallback={<EditCourseFormFallback />}>
      <EditCourseFormSection courseCode={courseCode} />
    </Suspense>
  );
}
