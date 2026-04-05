"use client";

import { useState } from "react";
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

export function SwapRequestToggle({ courseCode }: { courseCode: string }) {
  const [isDisableWarningOpen, setIsDisableWarningOpen] = useState(false);
  const toggleSwapRequestAction = useAction(api.actions.toggleSwapRequest);
  const { handle, isPending, error, setError } = useConvexActionState(
    toggleSwapRequestAction
  );

  const swapRequestState = useQuery(api.tasks.getActiveSwapRequestCount, {
    courseCode,
    acadYear: CurrentAcadYear,
  });

  const activeRequestsCount = swapRequestState?.activeRequestsCount ?? 0;
  const hasSwapped = swapRequestState?.hasSwapped ?? false;
  const isEnabled = !hasSwapped;

  const handleEnable = async () => {
    await handle({ courseCode, hasSwapped: false });
  };

  const handleDisable = async () => {
    if (activeRequestsCount > 0) {
      setIsDisableWarningOpen(true);
      return;
    }
    await handle({ courseCode, hasSwapped: true });
  };

  const confirmDisable = async () => {
    await handle({ courseCode, hasSwapped: true });

    // if (result?.success) {
    //   setIsDisableWarningOpen(false);
    // }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="flex flex-row gap-1 items-center"
              disabled={isPending}
            >
              <span className={isEnabled ? "text-green-400" : "text-red-400"}>
                {isEnabled ? "Enabled" : "Disabled"}
              </span>
              <ChevronsUpDown className="size-3.5 text-background-600 dark:text-background-400" />
            </Button>
          }
        />
        <DropdownMenuContent className="min-w-48">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Still looking to swap?</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleEnable}>
              Yes, Enabled
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDisable}>
              No, Disabled
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={isDisableWarningOpen} onOpenChange={setIsDisableWarningOpen}>
        <SheetContent side="bottom">
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
          {error && (
            <div className="px-4 text-sm text-red-500" role="alert">
              {error}
            </div>
          )}
          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => {
                setError(null);
                setIsDisableWarningOpen(false);
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDisable}
              disabled={isPending}
            >
              {isPending ? "Disabling..." : "Disable and Decline Requests"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
