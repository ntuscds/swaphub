import { History } from "@/components/history";

export default async function Page({
  params,
}: {
  params: Promise<{ courseCode: string }>;
}) {
  const { courseCode } = await params;
  return <History courseCode={courseCode} />;
}
