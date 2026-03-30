import { CourseSwapMatches } from "@/components/course-swaps";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/microsoft-auth";
import { CurrentAcadYear } from "@/lib/acad";

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

  return <CourseSwapMatches code={courseCode} acadYear={CurrentAcadYear} />;
}
