import { HydrationSafeScrollArea } from "@/components/hydration-safe-scroll-area";

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <HydrationSafeScrollArea className="h-screen-safe">
      <div className="flex flex-col items-center">
        <div className="flex flex-col gap-12 py-4 lg:py-6 xl:py-8 max-w-6xl w-full px-4">
          <div className="w-full h-full pb-20">{children}</div>
        </div>
      </div>
    </HydrationSafeScrollArea>
  );
}
