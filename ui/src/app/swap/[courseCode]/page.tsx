import { CourseSwapMatches } from "@/components/course-swaps";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import { getAuth } from "@/lib/microsoft-auth";
import { Suspense } from "react";

export default async function RequestPage({
  params,
}: {
  params: Promise<{
    courseCode: string;
  }>;
}) {
  const auth = await getAuth();
  if (!auth?.email) {
    redirect("/onboard");
  }
  const { courseCode } = await params;
  const header = await fetchQuery(api.tasks.getCourseHeaderByCode, {
    courseCode,
  });

  if (!header) {
    notFound();
  }

  let swappersText = null;
  if (header.swappersCount === 1) {
    swappersText = "1 swapper";
  } else if (header.swappersCount > 0) {
    swappersText = `${header.swappersCount} swappers`;
  }

  return (
    <div className="flex flex-col items-center">
      <div className="flex flex-col gap-12 py-8 max-w-4xl w-full">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <Button variant="link" className="w-fit px-0 text-primary-500">
              <Link href="/swap" className="flex items-center gap-0.5">
                <ArrowLeft className="size-4" /> Back
              </Link>
            </Button>
            <p className="text-xl lg:text-2xl xl:text-3xl max-w-lg font-bold">
              {header.code} {header.name}
            </p>
            {swappersText && <Badge variant="secondary">{swappersText}</Badge>}
          </div>

          <CourseSwapMatches
            courseId={header.courseId}
            name={header.name}
            code={header.code}
          />
        </div>
      </div>
    </div>
  );
}
