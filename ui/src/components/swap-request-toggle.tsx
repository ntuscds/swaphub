"use client";

import { useCallback, useEffect, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { ChevronsUpDown } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { CurrentAcadYear } from "@/lib/acad";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useConvexActionState } from "./use-convex-mutation-state";
import { cn } from "@/lib/utils";
import { Skeleton } from "./ui/skeleton";
import { Alert, AlertTitle } from "./ui/alert";

export function SwapRequestToggle({ courseCode }: { courseCode: string }) {
  const [isDisableWarningOpen, setIsDisableWarningOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const toggleSwapRequestAction = useAction(api.actions.toggleSwapRequest);
  const { handle, isPending, isSuccess, error, setError } =
    useConvexActionState(toggleSwapRequestAction);
  const [sheetSide, setSheetSide] = useState<"bottom" | "right">("bottom");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setSheetSide(mq.matches ? "right" : "bottom");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const swapRequestState = useQuery(api.tasks.getActiveSwapRequestCount, {
    courseCode,
    acadYear: CurrentAcadYear,
  });

  const activeRequestsCount = swapRequestState?.activeRequestsCount ?? 0;
  const hasSwapped = swapRequestState?.hasSwapped ?? false;
  const isEnabled = !hasSwapped;

  const handleEnable = useCallback(async () => {
    await handle({ courseCode, hasSwapped: false });
  }, [courseCode, handle]);

  const handleDisable = useCallback(async () => {
    if (activeRequestsCount > 0) {
      setIsDisableWarningOpen(true);
      return;
    }
    await handle({ courseCode, hasSwapped: true });
  }, [courseCode, handle, activeRequestsCount]);

  const confirmDisable = useCallback(async () => {
    await handle({ courseCode, hasSwapped: true });
  }, [courseCode, handle]);

  if (swapRequestState === undefined) {
    return <Skeleton className="w-24 h-7" />;
  }

  return (
    <>
      <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-24 flex flex-row gap-1 items-center"
              disabled={isPending}
            >
              <span
                className={cn({
                  "text-green-700 dark:text-green-500": isEnabled,
                  "text-red-700 dark:text-red-500": !isEnabled,
                  // isEnabled ? "text-green-400" : "text-red-400"
                })}
              >
                {isEnabled ? "Enabled" : "Disabled"}
              </span>
              <ChevronsUpDown className="size-3.5 text-background-600 dark:text-background-400" />
            </Button>
          }
        />
        <DropdownMenuContent className="min-w-48">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Still looking to swap?</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={async () => {
                await handleEnable();
                setIsMenuOpen(false);
              }}
            >
              Yes, Enabled
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                await handleDisable();
                setIsMenuOpen(false);
              }}
            >
              No, Disabled
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={isDisableWarningOpen} onOpenChange={setIsDisableWarningOpen}>
        <SheetContent side={sheetSide}>
          <SheetHeader>
            <SheetTitle>Disable Swap Requests?</SheetTitle>
            <SheetDescription>
              {activeRequestsCount > 0
                ? `This will decline ${activeRequestsCount} active request${
                    activeRequestsCount > 1 ? "s" : ""
                  } that you are part of.`
                : "You do not have active requests for this course."}
            </SheetDescription>
          </SheetHeader>
          <SheetFooter className="flex flex-col gap-3">
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error! {error}</AlertTitle>
              </Alert>
            )}
            {isSuccess && (
              <Alert variant="success">
                <AlertTitle>
                  Success! Swap request preference updated.
                </AlertTitle>
              </Alert>
            )}
            <div className="flex flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setError(null);
                  setIsDisableWarningOpen(false);
                }}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="flex-1"
                onClick={confirmDisable}
                disabled={isPending}
              >
                {isPending ? "Disabling..." : "Disable"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
