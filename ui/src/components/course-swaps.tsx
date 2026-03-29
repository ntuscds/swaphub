"use client";

import { Skeleton } from "./ui/skeleton";
import { ArrowRight, BadgeCheck, Loader2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import Link from "next/link";
import { useAction, useMutation, useQuery } from "convex/react";
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
import { Alert, AlertTitle } from "./ui/alert";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Checkbox } from "./ui/checkbox";
import { toast } from "sonner";
import { useConvexMutationState } from "./use-convex-mutation-state";
import { AcadYear } from "@/lib/acad";

type CourseRequestAndMatches = FunctionReturnType<
  typeof api.tasks.getCourseRequestAndMatches
>;
type DirectMatch = CourseRequestAndMatches["directMatches"][number];
type ThreeWayCycleMatch =
  CourseRequestAndMatches["threeWayCycleMatches"][number];

export function SwapItemMatchBottomSheetHint({
  courseId,
  match,
}: {
  courseId: Id<"courses">;
  match: DirectMatch;
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
    <div className="flex flex-col p-2.5 gap-4 border border-border rounded-md bg-card">
      <h3 className="text-sm font-medium text-primary">
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
            handle({
              courseId,
              otherSwapperId: match.otherSwapperId,
              // action: "already_swapped",
            })
          }
          disabled={isPending}
        >
          Already Swapped
        </Button>
        <Button
          variant="default"
          className="flex-1"
          onClick={() =>
            handle({ courseId, otherSwapperId: match.otherSwapperId })
          }
          disabled={isPending}
        >
          Accept
        </Button>
      </div>
    </div>
  );
}

export function SwapItemMatchBottomSheet({
  id,
  course,
  match,
  isAlreadySwapped,
  requestClose,
}: {
  id: Id<"swapper">;
  course: {
    id: Id<"courses">;
    haveIndex: string;
    hasSwapped: boolean;
    code: string;
    name: string;
  };
  match: DirectMatch;
  isAlreadySwapped: boolean;
  requestClose?: () => void;
}) {
  // const requestSwapMut = useMutation(api.tasks.requestSwap);
  // const requestSwapState = useConvexMutationState(requestSwapMut);
  const requestSwapMut = useAction(api.actions.sendSwapRequest);
  const requestSwapState = useConvexMutationState(requestSwapMut);

  let statusElement = null;
  if (match.status === "pending") {
    statusElement = match.isSelfInitiated ? (
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
    statusElement = <span className="text-sm text-primary">Request</span>;
  }

  let hintElement = null;
  if (match.status === "pending") {
    if (match.isSelfInitiated) {
      if (isAlreadySwapped) {
        hintElement = (
          <div className="flex flex-col p-2.5 gap-1 border border-border rounded-md bg-card">
            <h3 className="text-sm font-medium text-primary">
              You have requested a swap with this user. However, you already
              have a swap for this course.
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
            <h3 className="text-sm font-medium text-primary">
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
            <h3 className="text-sm font-medium text-primary">
              You have requested a swap with this user. However, you already
              have a swap for this course.
            </h3>
            <p className="text-muted-foreground">
              They won't be able to request a swap with you unless you unmark
              this course as already swapped.
            </p>
          </div>
        );
      } else {
        hintElement = (
          <SwapItemMatchBottomSheetHint courseId={course.id} match={match} />
        );
      }
    }
  }

  const disabled = match.status === "swapped" || match.status === "pending";
  return (
    <>
      <div className="max-h-[calc(100vh-120px)] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Request Swap</SheetTitle>

          {!match.isPerfectMatch && (
            <Alert className="mt-2" variant="warning">
              <AlertTitle>They may not want your index 😔</AlertTitle>
              <p className="text-muted-foreground">
                Perhaps they may not have considered your index, you should try
                to request a swap with them.
              </p>
            </Alert>
          )}
          {(match.status !== undefined || match.isPerfectMatch) && (
            <div className="flex flex-row gap-2 items-center pt-1">
              {match.status !== undefined && statusElement}
              {match.isPerfectMatch && (
                <Badge variant="outline" className="text-primary bg-primary/10">
                  Perfect Match! 🎉
                </Badge>
              )}
            </div>
          )}
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2">
              <p>Details</p>
            </div>
            <div className="border border-collapse border-muted rounded-xl">
              <Table className="w-full">
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium text-muted-foreground">
                      Course
                    </TableCell>
                    <TableCell className="text-foreground text-right text-wrap whitespace-normal">
                      {course.code} {course.name}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-muted-foreground">
                      Your Index
                    </TableCell>
                    <TableCell className="text-foreground text-right flex flex-row gap-1 items-center justify-end">
                      <p
                        className={cn({
                          "text-foreground": match.isPerfectMatch,
                          "text-yellow-500": !match.isPerfectMatch,
                        })}
                      >
                        {course.haveIndex}
                      </p>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-muted-foreground">
                      Their Index
                    </TableCell>
                    <TableCell className="text-primary text-right">
                      {match.index}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
      <SheetFooter className="flex flex-col gap-4 border-t border-border">
        {requestSwapState.error && (
          <Alert variant="destructive">
            <AlertTitle>Error!</AlertTitle>
            <p className="text-muted-foreground max-w-none">
              {requestSwapState.error}
            </p>
          </Alert>
        )}
        {/* {requestSwapMut.isSuccess && (
          <Alert variant="success">
            <AlertTitle>Success!</AlertTitle>
            <p className="text-muted-foreground max-w-none">
              We will notify the swapper of your request. They will reach out to
              you to confirm the swap.{" "}
              <span className="text-foreground">Keep your DMs open!</span>
            </p>
          </Alert>
        )} */}

        {hintElement}
        <div className="flex flex-row gap-2 pb-8">
          <Button className="flex-1" variant="outline" onClick={requestClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={() =>
              !disabled &&
              requestSwapState.handle({
                courseId: course.id,
                otherSwapperId: id,
              })
            }
            disabled={requestSwapState.isPending || disabled}
          >
            {requestSwapState.isPending && (
              <Loader2 className="size-4 animate-spin" />
            )}
            Request Swap
          </Button>
        </div>
      </SheetFooter>
    </>
  );
}

export function SwapItemMatch({
  match,
  myIndex,
  className,
  onRequestOpen,
}: {
  match: DirectMatch;
  myIndex: string;
  className?: string;
  onRequestOpen?: (id: Id<"swapper">) => void;
}) {
  let statusElement = null;
  if (match.status === "pending") {
    statusElement = match.isSelfInitiated ? (
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

  return (
    <TableRow
      onClick={() => onRequestOpen?.(match.otherSwapperId)}
      className={cn(
        {
          "bg-primary-500/10": match.isPerfectMatch,
          // "opacity-50": match.status === "swapped",
        },
        className
      )}
    >
      <TableCell className="font-medium text-sm lg:text-base text-foreground">
        {match.index}
      </TableCell>
      <TableCell className="text-foreground text-sm lg:text-base">
        {match.isPerfectMatch ? (
          <Badge variant="outline" className="text-primary-500 bg-primary/10">
            {myIndex}
          </Badge>
        ) : (
          <Badge variant="destructive">Don't have {"):"}</Badge>
        )}
      </TableCell>
      <TableCell className="flex flex-row gap-2 items-center justify-end text-right text-sm lg:text-base">
        {statusElement} <ArrowRight className="size-4 text-primary-500" />
      </TableCell>
    </TableRow>
  );
}

export function SwapItemThreeWayCycleMatch({
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
    statusElement = match.isSelfInitiated ? (
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

  return (
    <TableRow
      onClick={() =>
        onRequestOpen?.(match.otherSwapperId, match.middlemanSwapperId)
      }
      className={cn(
        {
          "bg-primary-500/10": match.isPerfectMatch,
          // "opacity-50": match.status === "swapped",
        },
        className
      )}
    >
      <TableCell className="font-medium text-sm lg:text-base text-foreground">
        1. <span className="text-primary-500"> {match.index}</span>
        <span className="text-muted-foreground text-xs">{" <-> "}</span>
        {match.middlemanIndex} <br />
        2. <span className="text-primary-500"> {match.middlemanIndex}</span>
        <span className="text-muted-foreground text-xs">{" <-> "}</span>
        {match.index}
      </TableCell>
      <TableCell className="flex flex-row gap-2 items-center justify-end text-right text-sm lg:text-base">
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
  const requestsQuery = useQuery(api.tasks.getCourseRequestAndMatches, {
    courseCode: code,
    acadYear,
  });
  const toggleSwapRequestMut = useMutation(api.tasks.toggleSwapRequest);
  const toggleSwapRequestState = useConvexMutationState(toggleSwapRequestMut);
  const [bottomSheetMatchItem, setBottomSheetMatchItem] = useState<{
    id: Id<"swapper">;
    isOpen: boolean;
  } | null>(null);
  const bottomSheetMatchItemData = useMemo(() => {
    if (!bottomSheetMatchItem?.id) return null;
    if (!requestsQuery) return null;
    const match = requestsQuery.directMatches.find(
      (match) => match.otherSwapperId === bottomSheetMatchItem.id
    );
    if (!match) return null;
    if (
      !requestsQuery.course.haveIndex ||
      requestsQuery.course.hasSwapped === undefined
    ) {
      return null;
    }
    return {
      id: bottomSheetMatchItem.id,
      course: {
        id: requestsQuery.course.id,
        haveIndex: requestsQuery.course.haveIndex,
        hasSwapped: requestsQuery.course.hasSwapped,
        code,
        name: requestsQuery.course.name,
      },
      match,
    };
  }, [bottomSheetMatchItem?.id, requestsQuery, code]);

  // const editUrl = useMemo(() => {
  //   if (typeof window === "undefined") return `/swap/${code}/edit`;
  //   return `/swap/${code}/edit?backTo=${encodeURIComponent(window.location.href)}`;
  // }, [code]);
  const [editUrl, setEditUrl] = useState<string>("/swap");
  useEffect(() => {
    if (typeof window === "undefined") return;
    setEditUrl(
      `/swap/${code}/edit?backTo=${encodeURIComponent(window.location.href)}`
    );
  }, [code]);

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
              <TableHead className="font-medium text-sm lg:text-base text-muted-foreground uppercase">
                They Want
              </TableHead>
              <TableHead className="font-medium text-sm lg:text-base text-muted-foreground text-right uppercase">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requestsQuery.directMatches.map((rawMatch, index) => {
              return (
                <SwapItemMatch
                  key={rawMatch.otherSwapperId}
                  match={rawMatch}
                  myIndex={requestsQuery.course.haveIndex ?? ""}
                  className={cn({
                    "opacity-50": disabled,
                    "border-b border-border":
                      index !== requestsQuery.directMatches.length - 1,
                  })}
                  onRequestOpen={() =>
                    setBottomSheetMatchItem({
                      id: rawMatch.otherSwapperId,
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
                Swap Sequence
              </TableHead>
              <TableHead className="font-medium text-sm lg:text-base text-muted-foreground text-right uppercase">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requestsQuery.threeWayCycleMatches.map((rawMatch, index) => {
              return (
                <SwapItemThreeWayCycleMatch
                  key={`${rawMatch.otherSwapperId}-${rawMatch.middlemanSwapperId}-${index}`}
                  match={rawMatch}
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
      <div className="bg-card border border-collapse border-muted rounded-md">
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

  return (
    <div className="flex flex-col gap-4">
      {toggleSwapRequestState.error && (
        <Alert variant="destructive">
          <AlertTitle>Error!</AlertTitle>
          <p className="text-muted-foreground max-w-none">
            {toggleSwapRequestState.error}
          </p>
        </Alert>
      )}
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
        {/* <div className="flex flex-row gap-2 items-center justify-between">
          <h2 className="text-base lg:text-lg xl:text-xl font-bold">Matches</h2>
          {requestsQuery && requestsQuery.course.hasSwapped !== undefined && (
            <div className="flex flex-row gap-2 items-center">
              <p className="text-sm text-muted-foreground">Have Swapped?</p>
              <Checkbox
                className="size-5"
                checked={requestsQuery.course.hasSwapped}
                onCheckedChange={() => {
                  void toggleSwapRequestState.handle({
                    courseId: requestsQuery.course.id,
                    hasSwapped: !requestsQuery.course.hasSwapped,
                  });
                }}
                disabled={toggleSwapRequestState.isPending}
              />
            </div>
          )}
        </div> */}
        {/* {requestsQuery !== undefined &&
          requestsQuery.course.hasSwapped === true && (
            <div className="text-sm text-muted-foreground border border-border rounded-md p-2 bg-card">
              <h2 className="text-foreground">
                You already found a swap for this course.
              </h2>
              <p className="text-muted-foreground">
                Keep this disabled if you{"'"}ve already found a match to avoid
                receiving swap requests.
              </p>
            </div>
          )} */}
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
        <SheetContent side="bottom">
          {bottomSheetMatchItemData && (
            <SwapItemMatchBottomSheet
              id={bottomSheetMatchItemData.id}
              course={bottomSheetMatchItemData.course}
              match={bottomSheetMatchItemData.match}
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
