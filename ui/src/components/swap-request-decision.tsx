"use client";

import {
  DirectSwapArtboard,
  ThreeWayCycleArtboard,
} from "@/components/course-swap-artboard";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConvexActionState } from "@/components/use-convex-mutation-state";
import { reduceStatus } from "@/lib/swap-request";
import { api } from "../../convex/_generated/api";
import { Loader2 } from "lucide-react";
import { useAction } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useMemo, useState, type ReactNode } from "react";

type SwapRequest = FunctionReturnType<
  typeof api.actions.getSwapRequestByEncryptedPayload
>;

function hasCurrentUserAccepted(request: SwapRequest): boolean {
  if (request.iam === "initiator") {
    return request.initiator.hasAccepted;
  }
  if (request.iam === "target") {
    return request.target.hasAccepted;
  }
  return request.middleman?.hasAccepted ?? false;
}

export function SwapRequestDecision({
  request: initialRequest,
  encryptedPayload,
}: {
  request: SwapRequest;
  encryptedPayload: string;
}) {
  const [request, setRequest] = useState(initialRequest);
  const [lastAction, setLastAction] = useState<"accept" | "decline" | null>(
    null
  );
  const handleSwapRequestDecision = useAction(
    api.actions.handleSwapRequestDecision
  );
  const handleSwapRequestDecisionState = useConvexActionState(
    handleSwapRequestDecision,
    {
      onSuccess: (data) => {
        setRequest(data);
      },
    }
  );

  const isDecisionDisabled = useMemo(() => {
    return (
      handleSwapRequestDecisionState.isPending ||
      request.isCompleted ||
      hasCurrentUserAccepted(request)
    );
  }, [handleSwapRequestDecisionState.isPending, request]);

  let statusElement: ReactNode = null;
  if (request.isCompleted) {
    statusElement =
      request.initiator.hasAccepted &&
      request.target.hasAccepted &&
      (request.middleman === undefined || request.middleman?.hasAccepted) ? (
        <Badge variant="success">Completed</Badge>
      ) : (
        <Badge variant="declined">Declined</Badge>
      );
  } else {
    statusElement = <Badge variant="warning">Pending</Badge>;
  }

  return (
    <div className="h-screen-safe flex flex-col w-full">
      <div className="flex-1 overflow-y-auto px-4 py-12">
        <div className="flex flex-col gap-2 w-full">
          <h1 className="w-full text-xl lg:text-2xl font-bold max-w-md">
            {request.course.code} {request.course.name} Swap Request
          </h1>

          <div className="w-full">{statusElement}</div>

          <div className="w-full">
            {request.middleman ? (
              <ThreeWayCycleArtboard
                className="h-80 md:h-88 lg:h-96 xl:h-112 2xl:h-128"
                iam={request.iam}
                initiator={{
                  index: request.initiator.index,
                  username: request.initiator.username,
                  status: reduceStatus(
                    request.initiator.hasAccepted,
                    request.isCompleted
                  ),
                }}
                target={{
                  index: request.target.index,
                  username: request.target.username,
                  status: reduceStatus(
                    request.target.hasAccepted,
                    request.isCompleted
                  ),
                }}
                middleman={{
                  index: request.middleman.index,
                  username: request.middleman.username,
                  status: reduceStatus(
                    request.middleman.hasAccepted,
                    request.isCompleted
                  ),
                }}
              />
            ) : (
              <DirectSwapArtboard
                className="h-44 md:h-52 lg:h-56 xl:h-64 2xl:h-72"
                iam={request.iam === "initiator" ? "initiator" : "target"}
                initiator={{
                  index: request.initiator.index,
                  username: request.initiator.username,
                  status: reduceStatus(
                    request.initiator.hasAccepted,
                    request.isCompleted
                  ),
                }}
                target={{
                  index: request.target.index,
                  username: request.target.username,
                  status: reduceStatus(
                    request.target.hasAccepted,
                    request.isCompleted
                  ),
                }}
              />
            )}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-border bg-background p-4">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
          {handleSwapRequestDecisionState.error && (
            <Alert variant="destructive">
              <AlertTitle>
                Error! {handleSwapRequestDecisionState.error}
              </AlertTitle>
            </Alert>
          )}
          {handleSwapRequestDecisionState.isSuccess && (
            <Alert variant="success">
              <AlertTitle>
                Success!{" "}
                {lastAction === "accept"
                  ? "Request accepted successfully."
                  : "Request declined successfully."}
              </AlertTitle>
            </Alert>
          )}

          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={isDecisionDisabled}
                  >
                    {handleSwapRequestDecisionState.isPending && (
                      <Loader2 className="size-4 animate-spin" />
                    )}
                    Decline
                  </Button>
                }
              />

              <DropdownMenuContent side="top" align="end" className="w-72">
                <DropdownMenuItem
                  onClick={() => {
                    setLastAction("decline");
                    handleSwapRequestDecisionState.handle({
                      encryptedPayload,
                      action: "decline",
                      shouldMarkAsSwappedIfDecline: false,
                    });
                  }}
                >
                  <div className="flex flex-col gap-0.5">
                    <span>Decline This Request</span>
                    <span className="text-xs text-muted-foreground">
                      Only decline this request. Your other requests for this
                      course will remain active.
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    setLastAction("decline");
                    handleSwapRequestDecisionState.handle({
                      encryptedPayload,
                      action: "decline",
                      shouldMarkAsSwappedIfDecline: true,
                    });
                  }}
                >
                  <div className="flex flex-col gap-0.5">
                    <span>Decline and Disable Course Requests</span>
                    <span className="text-xs text-muted-foreground">
                      Decline all active requests and disables swap requests for
                      this course
                    </span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              className="flex-1"
              onClick={() => {
                setLastAction("accept");
                handleSwapRequestDecisionState.handle({
                  encryptedPayload,
                  action: "accept",
                  shouldMarkAsSwappedIfDecline: false,
                });
              }}
              disabled={isDecisionDisabled}
            >
              {handleSwapRequestDecisionState.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Accept
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
