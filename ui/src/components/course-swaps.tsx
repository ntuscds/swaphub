"use client";

import { Skeleton } from "./ui/skeleton";
import {
  AlertTriangleIcon,
  ArrowRight,
  Loader2,
  Pencil,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import Link from "next/link";
import { useAction } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useConvexMutationState } from "./use-convex-mutation-state";
import { AcadYear } from "@/lib/acad";
import {
  DirectSwapArtboard,
  ThreeWayCycleArtboard,
} from "./course-swap-artboard";
import { useStableQueryWithStatus } from "./use-stable-query";
import { getProfileImageUrl } from "@/lib/user";

type CourseRequestAndMatches = FunctionReturnType<
  typeof api.tasks.getCourseRequestAndMatches
>;
type DirectMatch = CourseRequestAndMatches["directMatches"][number];
type ThreeWayCycleMatch =
  CourseRequestAndMatches["threeWayCycleMatches"][number];

export function SwapConfirmationBottomSheetFooter({
  // courseId,
  // match,
  targetSwapperId,
  middlemanSwapperId,
}: {
  targetSwapperId: Id<"swapper">;
  middlemanSwapperId?: Id<"swapper">;
}) {
  const handleSwapRequestCallbackMut = useAction(api.actions.sendSwapRequest);
  const { handle, error, isPending } = useConvexMutationState(
    handleSwapRequestCallbackMut,
    {
      onSuccess: () => {
        toast.success("Swap request accepted!", {
          description:
            "We will notify the swapper of your request. They will reach out to you to confirm the swap. Keep your DMs open!",
        });
      },
    }
  );

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-medium text-primary-500">
        Someone wants to swap with you!
      </h3>
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error!</AlertTitle>
          <p className="text-muted-foreground max-w-none">{error}</p>
        </Alert>
      )}
      <div className="w-full flex flex-row gap-2">
        <Button
          variant="ghost"
          className="flex-1 border border-border bg-primary/20"
          onClick={() =>
            // handle({
            //   courseId,
            //   otherSwapperId: match.otherSwapperId,
            //   // action: "already_swapped",
            // })
            {}
          }
          disabled={isPending}
        >
          Decline
        </Button>
        <Button
          variant="default"
          className="flex-1"
          onClick={
            () => {}
            // handle({ courseId, otherSwapperId: match.otherSwapperId })
          }
          disabled={isPending}
        >
          Accept
        </Button>
      </div>
    </div>
  );
}

function RequestSwapBottomSheetFooter({
  disabled,
  // id,
  targetSwapperId,
  middlemanSwapperId,
  requestClose,
}: {
  disabled: boolean;
  targetSwapperId: Id<"swapper">;
  middlemanSwapperId?: Id<"swapper">;
  requestClose?: () => void;
}) {
  const requestSwapMut = useAction(api.actions.sendSwapRequest);
  const requestSwapState = useConvexMutationState(requestSwapMut);
  return (
    <>
      {requestSwapState.error && (
        <Alert variant="destructive">
          <AlertTitle>Error!</AlertTitle>
          <p className="text-muted-foreground max-w-none">
            {requestSwapState.error}
          </p>
        </Alert>
      )}
      {requestSwapState.isSuccess && (
        <Alert variant="success">
          <AlertTitle>Success!</AlertTitle>
          <p className="text-muted-foreground max-w-none">
            Swap request sent successfully!
          </p>
        </Alert>
      )}
      <div className="flex flex-row gap-2 pb-8">
        <Button className="flex-1" variant="outline" onClick={requestClose}>
          Cancel
        </Button>
        <Button
          className="flex-1"
          onClick={() => {
            if (disabled) {
              return;
            }
            requestSwapState.handle({
              targetSwapperId,
              middlemanSwapperId,
            });
          }}
          disabled={requestSwapState.isPending || disabled}
        >
          {requestSwapState.isPending && (
            <Loader2 className="size-4 animate-spin" />
          )}
          Request Swap
        </Button>
      </div>
    </>
  );
  // return (

  // );
}

export function SwapItemMatchBottomSheet({
  course,
  match: matchObj,
  isAlreadySwapped,
  requestClose,
  isSheet = true,
}: {
  course: {
    id: Id<"courses">;
    haveIndex: string;
    hasSwapped: boolean;
    code: string;
    name: string;
  };
  match:
    | {
        type: "direct";
        match: DirectMatch;
      }
    | {
        type: "three-way-cycle";
        match: ThreeWayCycleMatch;
      };
  isAlreadySwapped: boolean;
  requestClose?: () => void;
  isSheet?: boolean;
}) {
  let statusElement = null;
  const { match } = matchObj;
  if (match.status === "pending") {
    statusElement =
      match.iam === "initiator" ? (
        <Badge variant="default" className="text-yellow-500 bg-yellow-700/30">
          Pending
        </Badge>
      ) : (
        <Badge variant="default" className="text-yellow-500 bg-yellow-700/30">
          Requested by Someone!
        </Badge>
      );
  } else if (match.status === "swapped") {
    statusElement = (
      <Badge variant="default" className="text-gray-400 bg-gray-600/30">
        Already Swapped
      </Badge>
    );
  } else {
    statusElement = <span className="text-sm text-primary-500">Request</span>;
  }

  const disabled = match.status === "swapped" || match.status === "pending";
  let hintElement = null;
  let footer = (
    <RequestSwapBottomSheetFooter
      disabled={disabled}
      targetSwapperId={match.target.id}
      middlemanSwapperId={
        matchObj.type === "three-way-cycle"
          ? matchObj.match.middleman.id
          : undefined
      }
      requestClose={requestClose}
    />
  );
  if (match.status === "pending") {
    if (match.iam === "initiator") {
      if (isAlreadySwapped) {
        hintElement = (
          <div className="flex flex-col p-2.5 gap-1 border border-border rounded-md bg-card">
            <h3 className="text-sm font-medium text-primary-500">
              You have already swapped.
            </h3>
            <p className="text-muted-foreground">
              They won't be able to request a swap with you unless you unmark
              this course as already swapped.
            </p>
          </div>
        );
      } else {
        hintElement = (
          <div className="flex flex-col p-2.5 gap-1 border border-border rounded-md bg-card">
            <h3 className="text-sm font-medium text-primary-500">
              You have requested a swap with this user.
            </h3>
            <p className="text-muted-foreground">
              We will notify the swapper of your request. They will reach out to
              you to confirm the swap.{" "}
              <span className="text-foreground">Keep your DMs open!</span>
            </p>
          </div>
        );
      }
    } else {
      if (isAlreadySwapped) {
        hintElement = (
          <div className="flex flex-col p-2.5 gap-1 border border-border rounded-md bg-card">
            <h3 className="text-sm font-medium text-primary-500">
              They have already swapped.
            </h3>
            <p className="text-muted-foreground">
              They won't be able to request a swap with you unless you unmark
              this course as already swapped.
            </p>
          </div>
        );
      } else {
        footer = (
          <SwapConfirmationBottomSheetFooter
            targetSwapperId={match.target.id}
            middlemanSwapperId={
              matchObj.type === "three-way-cycle"
                ? matchObj.match.middleman.id
                : undefined
            }
            // match={match}
          />
        );
      }
    }
  }

  let warningElement = null;
  if (matchObj.type === "direct") {
    if (
      matchObj.match.iam === "initiator" &&
      !matchObj.match.iHaveWhatTheyWant
    ) {
      warningElement = (
        <Alert variant="warning">
          <AlertTitle>You don't have what they want!</AlertTitle>
          <AlertDescription className="text-muted-foreground dark:text-muted-foreground max-w-none text-sm">
            You may still request a swap with them, but they may not accept it.
          </AlertDescription>
        </Alert>
      );
    }
    if (matchObj.match.iam === "target" && !matchObj.match.theyHaveWhatIWant) {
      warningElement = (
        <Alert variant="warning">
          <AlertTitle>They don't have what you want!</AlertTitle>
          <AlertDescription className="text-muted-foreground dark:text-muted-foreground max-w-none text-sm">
            You can still accept their swap, but it may not be ideal.
          </AlertDescription>
        </Alert>
      );
    }
  }

  return (
    <>
      <div className="max-h-[calc(100vh-120px)] overflow-y-auto">
        {isSheet ? (
          <SheetHeader>
            <SheetTitle>
              {course.code} {course.name} Swap Request
            </SheetTitle>
            <div className="pt-2">{statusElement}</div>
          </SheetHeader>
        ) : (
          <div className="flex flex-col gap-2">
            <h2 className="text-base lg:text-lg xl:text-xl font-bold">
              {course.code} {course.name} Swap Request
            </h2>
            {statusElement}
          </div>
        )}
        <div className="flex flex-col gap-4 items-center justify-center px-4">
          <div className="w-full max-w-72">
            {matchObj.type === "direct" ? (
              <DirectSwapArtboard
                initiator={{
                  index: matchObj.match.initiator.index,
                  username: matchObj.match.initiator.username,
                }}
                target={{
                  index: matchObj.match.target.index,
                  username: matchObj.match.target.username,
                }}
                iam={matchObj.match.iam}
                // iam="intiator"
              />
            ) : (
              <ThreeWayCycleArtboard
                initiator={{
                  index: matchObj.match.initiator.index,
                  username: matchObj.match.initiator.username,
                }}
                target={{
                  index: matchObj.match.target.index,
                  username: matchObj.match.target.username,
                }}
                middleman={{
                  index: matchObj.match.middleman.index,
                  username: matchObj.match.middleman.username,
                }}
                iam={matchObj.match.iam}
              />
            )}
          </div>
          {warningElement}
        </div>
      </div>
      <SheetFooter className="flex flex-col gap-4 border-t border-border">
        {hintElement}
        {footer}
      </SheetFooter>
    </>
  );
}

export function SwapDirectMatchRow({
  match,
  className,
  onRequestOpen,
}: {
  match: DirectMatch;
  className?: string;
  onRequestOpen?: (id: Id<"swapper">) => void;
}) {
  let statusElement = null;
  if (match.status === "pending") {
    statusElement =
      match.iam === "initiator" ? (
        <Badge variant="default" className="text-yellow-500 bg-yellow-700/30">
          Pending
        </Badge>
      ) : (
        <Badge variant="default" className="text-yellow-500 bg-yellow-700/30">
          Requested by Someone!
        </Badge>
      );
  } else if (match.status === "swapped") {
    statusElement = (
      <Badge variant="default" className="text-gray-400 bg-gray-600/30">
        Already Swapped
      </Badge>
    );
  } else {
    statusElement = (
      <span className="text-sm lg:text-base text-primary-500">Request</span>
    );
  }

  return (
    <TableRow
      onClick={() => onRequestOpen?.(match.target.id)}
      className={cn(
        {
          "bg-primary-500/10": match.isPerfectMatch,
          // "opacity-50": match.status === "swapped",
        },
        className
      )}
    >
      <TableCell
        className={cn("h-12 font-medium text-sm lg:text-base text-foreground", {
          "text-destructive": !match.theyHaveWhatIWant,
        })}
      >
        {match.iam === "initiator" ? (
          <div className="flex flex-row gap-2 items-center">
            <img
              src={getProfileImageUrl(match.target.username)}
              alt={match.target.username}
              className="size-8 rounded-full"
            />

            {!match.iHaveWhatTheyWant ? (
              <div className="flex flex-row items-center gap-1">
                <span className="text-yellow-500">{match.target.index}</span>
                <AlertTriangleIcon className="size-4.5 text-card fill-yellow-500" />
              </div>
            ) : (
              match.target.index
            )}
          </div>
        ) : (
          <div className="flex flex-row gap-2 items-center">
            <img
              src={getProfileImageUrl(match.initiator.username)}
              alt={match.initiator.username}
              className="size-8 rounded-full"
            />
            {!match.theyHaveWhatIWant ? (
              <div className="flex flex-row items-center gap-1">
                <span className="text-yellow-500">{match.target.index}</span>
                <AlertTriangleIcon className="size-4.5 text-card fill-yellow-500" />
              </div>
            ) : (
              match.initiator.index
            )}
          </div>
        )}
      </TableCell>
      <TableCell className="h-12 flex flex-row gap-2 items-center justify-end text-right text-sm lg:text-base">
        {statusElement} <ArrowRight className="size-4 text-primary-500" />
      </TableCell>
    </TableRow>
  );
}

export function SwapThreeWayRow({
  match,
  className,
  onRequestOpen,
}: {
  match: ThreeWayCycleMatch;
  className?: string;
  onRequestOpen?: (id: Id<"swapper">, middlemanId: Id<"swapper">) => void;
}) {
  let statusElement = null;
  if (match.status === "pending") {
    statusElement =
      match.iam === "initiator" ? (
        <Badge variant="default" className="text-yellow-500 bg-yellow-700/30">
          Pending
        </Badge>
      ) : (
        <Badge variant="default" className="text-yellow-500 bg-yellow-700/30">
          Requested by Someone!
        </Badge>
      );
  } else if (match.status === "swapped") {
    statusElement = (
      <Badge variant="default" className="text-gray-400 bg-gray-600/30">
        Already Swapped
      </Badge>
    );
  } else {
    statusElement = <span className="text-sm text-primary-500">Request</span>;
  }

  const otherParticipants = useMemo(() => {
    const participants = [];
    if (match.iam !== "initiator") {
      participants.push(match.initiator);
    }
    if (match.iam !== "target") {
      participants.push(match.target);
    }
    if (match.iam !== "middleman") {
      participants.push(match.middleman);
    }
    return participants;
  }, [match]);

  return (
    <TableRow
      onClick={() => onRequestOpen?.(match.target.id, match.middleman.id)}
      className={className}
    >
      <TableCell className="h-12 font-medium text-sm lg:text-base text-foreground">
        <div className="flex flex-row gap-4 items-center">
          {otherParticipants.map((participant) => (
            <div
              className="flex flex-row gap-2 items-center"
              key={participant.id}
            >
              <img
                src={getProfileImageUrl(participant.username)}
                alt={participant.username}
                className="size-8 rounded-full"
              />
              {participant.index}
            </div>
          ))}
        </div>
      </TableCell>
      <TableCell className="h-12 flex flex-row gap-2 items-center justify-end text-right text-sm lg:text-base">
        {statusElement} <ArrowRight className="size-4 text-primary-500" />
      </TableCell>
    </TableRow>
  );
}

export function CourseSwapMatches({
  // courseId,
  // name,
  code,
  acadYear,
}: {
  // courseId: Id<"courses">;
  // name: string;
  code: string;
  acadYear: AcadYear;
}) {
  const requestsQueryRes = useStableQueryWithStatus(
    api.tasks.getCourseRequestAndMatches,
    {
      courseCode: code,
      acadYear,
    }
  );
  const [bottomSheetMatchItem, setBottomSheetMatchItem] = useState<{
    match:
      | {
          type: "direct";
          match: DirectMatch;
        }
      | {
          type: "three-way-cycle";
          match: ThreeWayCycleMatch;
        };
    isOpen: boolean;
  } | null>(null);
  const [editUrl, setEditUrl] = useState<string>("/swap");
  const [sheetSide, setSheetSide] = useState<"bottom" | "right">("bottom");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setEditUrl(
      `/swap/${code}/edit?backTo=${encodeURIComponent(window.location.href)}`
    );
  }, [code]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setSheetSide(mq.matches ? "right" : "bottom");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (requestsQueryRes.status === "error") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{requestsQueryRes.error.message}</AlertDescription>
      </Alert>
    );
  }
  const requestsQuery = requestsQueryRes.data;

  let directMatchElement = null;
  if (requestsQuery === undefined) {
    directMatchElement = <Skeleton className="h-48 w-full" />;
  } else if (requestsQuery.directMatches.length > 0) {
    const disabled = requestsQuery.course.hasSwapped ?? false;
    directMatchElement = (
      <div className="w-full flex flex-col bg-card border border-border rounded-md py-1 text-sm">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="font-medium text-sm lg:text-base text-muted-foreground uppercase">
                Their Index
              </TableHead>
              {/* <TableHead className="font-medium text-sm lg:text-base text-muted-foreground uppercase">
                They Want
              </TableHead> */}
              <TableHead className="font-medium text-sm lg:text-base text-muted-foreground text-right uppercase">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requestsQuery.directMatches.map((rawMatch, index) => {
              return (
                <SwapDirectMatchRow
                  key={rawMatch.target.id}
                  match={rawMatch}
                  // myIndex={requestsQuery.course.haveIndex ?? ""}
                  className={cn({
                    "opacity-50": disabled,
                    "border-b border-border":
                      index !== requestsQuery.directMatches.length - 1,
                  })}
                  onRequestOpen={() =>
                    setBottomSheetMatchItem({
                      // id: rawMatch.otherSwapperId,
                      match: {
                        type: "direct",
                        match: rawMatch,
                      },
                      isOpen: true,
                    })
                  }
                />
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  } else {
    directMatchElement = (
      <div className="w-full flex flex-col items-center justify-center bg-card border border-border rounded-md py-4 text-sm">
        <div className="text-center text-sm lg:text-base xl:text-lg text-muted-foreground">
          No matches yet {"):"}
        </div>
      </div>
    );
  }

  let threeWayCycleMatchElement = null;
  if (requestsQuery === undefined) {
    threeWayCycleMatchElement = <Skeleton className="h-48 w-full" />;
  } else if (requestsQuery.threeWayCycleMatches.length > 0) {
    threeWayCycleMatchElement = (
      <div className="w-full flex flex-col bg-card border border-border rounded-md py-1 text-sm">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="font-medium text-sm lg:text-base text-muted-foreground uppercase">
                Their Indexes
              </TableHead>
              <TableHead className="font-medium text-sm lg:text-base text-muted-foreground text-right uppercase">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requestsQuery.threeWayCycleMatches.map((rawMatch, index) => {
              return (
                <SwapThreeWayRow
                  key={`${rawMatch.target.id}-${rawMatch.middleman.id}-${index}`}
                  match={rawMatch}
                  // myIndex={requestsQuery.course.haveIndex ?? ""}
                  onRequestOpen={() => {
                    setBottomSheetMatchItem({
                      match: {
                        type: "three-way-cycle",
                        match: rawMatch,
                      },
                      isOpen: true,
                    });
                  }}
                />
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  } else {
    threeWayCycleMatchElement = (
      <div className="w-full flex flex-col items-center justify-center bg-card border border-border rounded-md py-4 text-sm">
        <div className="text-center text-sm lg:text-base xl:text-lg text-muted-foreground">
          No 3-way cycles yet {"):"}
        </div>
      </div>
    );
  }

  let yourRequestElement = null;
  if (requestsQuery === undefined) {
    yourRequestElement = <Skeleton className="h-48 w-full" />;
  } else {
    yourRequestElement = (
      <div className="bg-card border border-collapse border-border rounded-md">
        <Table className="w-full">
          <TableBody>
            <TableRow>
              <TableCell className="font-medium text-sm lg:text-base text-muted-foreground">
                Your Index
              </TableCell>
              <TableCell className="text-foreground text-right text-sm lg:text-base">
                {requestsQuery.course.haveIndex ?? (
                  <span className="text-muted-foreground">Not Set</span>
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium text-sm lg:text-base text-muted-foreground">
                Want Index
              </TableCell>
              <TableCell className="text-foreground text-right text-sm lg:text-base text-wrap whitespace-normal max-w-sm">
                {requestsQuery.wantIndexes.length > 0 ? (
                  requestsQuery.wantIndexes.join(", ")
                ) : (
                  <span className="text-muted-foreground">Not Set</span>
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  let hasSwappedEle = null;
  if (requestsQuery?.course.hasSwapped === true) {
    hasSwappedEle = (
      <div className="flex flex-col gap-1 justify-center items-center w-full bg-green-100 dark:bg-green-950 border border-green-300 dark:border-green-700 rounded-md p-2.5 lg:p-4">
        <h2 className="text-base font-bold text-green-800 dark:text-green-50">
          You have already Swapped!
        </h2>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {hasSwappedEle}
      <div className="flex flex-col gap-2">
        <div className="flex flex-row gap-2 items-center justify-between">
          <h2 className="text-base lg:text-lg xl:text-xl font-bold">
            Your Request
          </h2>
          <Link href={editUrl}>
            <Button variant="outline" size="lg">
              <Pencil className="size-3.5" />
              Edit
            </Button>
          </Link>
        </div>
        {yourRequestElement}
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-base lg:text-lg xl:text-xl font-bold">
          Direct Matches
        </h2>
        {directMatchElement}
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-base lg:text-lg xl:text-xl font-bold">
          3-Way Cycles
        </h2>
        {threeWayCycleMatchElement}
      </div>
      <Sheet
        open={bottomSheetMatchItem?.isOpen ?? false}
        onOpenChange={(open) =>
          setBottomSheetMatchItem((old) => {
            if (!old) return old;
            return { ...old, isOpen: open };
          })
        }
      >
        <SheetContent side={sheetSide}>
          {bottomSheetMatchItem?.match && requestsQuery?.course && (
            <SwapItemMatchBottomSheet
              course={{
                id: requestsQuery.course.id,
                haveIndex: requestsQuery.course.haveIndex ?? "",
                hasSwapped: requestsQuery.course.hasSwapped ?? false,
                code: requestsQuery.course.code ?? "",
                name: requestsQuery.course.name ?? "",
              }}
              match={bottomSheetMatchItem.match}
              isAlreadySwapped={requestsQuery?.course.hasSwapped === true}
              requestClose={() =>
                setBottomSheetMatchItem((old) => {
                  if (!old) return old;
                  return { ...old, isOpen: false };
                })
              }
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
