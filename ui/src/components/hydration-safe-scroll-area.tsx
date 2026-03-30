"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Props = ComponentProps<typeof ScrollArea>;

/**
 * Base UI ScrollArea measures the viewport on the client and can diverge from SSR HTML.
 * We render a visually similar native scroll container until mount, then swap to ScrollArea.
 * Server + first client paint match; no hydration warning.
 */
export function HydrationSafeScrollArea({
  className,
  children,
  ...props
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn(
          "relative min-h-0 overflow-hidden",
          // Mirror scroll-area root + viewport so layout matches the real component
          className
        )}
      >
        <div
          className={cn(
            "size-full max-h-full overflow-y-auto overscroll-contain rounded-[inherit] outline-none",
            // Thin scrollbar approximating ScrollArea thumb (bg-border, ~10px track)
            "[scrollbar-width:thin]",
            "[scrollbar-color:var(--border)_transparent]",
            "[&::-webkit-scrollbar]:w-2.5",
            "[&::-webkit-scrollbar-thumb]:rounded-full",
            "[&::-webkit-scrollbar-thumb]:bg-border",
            "[&::-webkit-scrollbar-track]:bg-transparent"
          )}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className={className} {...props}>
      {children}
    </ScrollArea>
  );
}
