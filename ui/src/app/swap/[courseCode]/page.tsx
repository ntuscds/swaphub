import { CourseSwapMatches } from "@/components/course-swaps";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
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
