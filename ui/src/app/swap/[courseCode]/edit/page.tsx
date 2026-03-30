import { SwapRequestFormWithPrefill } from "@/components/swap-request";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "../../../../../convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { Suspense } from "react";
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
}: {
  params: Promise<{
    courseCode: string;
  }>;
}) {
  const { courseCode } = await params;

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
