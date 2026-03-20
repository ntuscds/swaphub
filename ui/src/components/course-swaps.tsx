"use client";

import { Skeleton } from "./ui/skeleton";
import { ArrowRight, BadgeCheck, Loader2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "./ui/badge";
import { Alert, AlertTitle } from "./ui/alert";
import { useMemo, useState } from "react";
import { Checkbox } from "./ui/checkbox";
import { toast } from "sonner";
import { useConvexMutationState } from "./use-convex-mutation-state";

type SwapCourseRequestCourse = {
  id: Id<"courses">;
  haveIndex: string;
  hasSwapped: boolean;
};

type SwapCourseRequestMatch = {
  id: Id<"swapper">;
  numberOfRequests: number;
  isPerfectMatch: boolean;
  index: string;
  isVerified: boolean;
  requestedAt: number;
  status?: "pending" | "swapped";
  isSelfInitiated: boolean;
  revealedBy?: string;
};

export function SwapItemMatchBottomSheetHint({
  courseId,
  match,
}: {
  courseId: Id<"courses">;
  match: SwapCourseRequestMatch;
}) {
  const handleSwapRequestCallbackMut = useMutation(
    api.tasks.handleSwapRequestCallback
  );
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
        Hey, @{match.revealedBy ?? "???"} want to swap with you!
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
              otherSwapperId: match.id,
              action: "already_swapped",
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
            handle({ courseId, otherSwapperId: match.id, action: "accept" })
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
  course: SwapCourseRequestCourse & {
    code: string;
    name: string;
  };
  match: SwapCourseRequestMatch;
  isAlreadySwapped: boolean;
  requestClose?: () => void;
}) {
  const requestSwapMut = useMutation(api.tasks.requestSwap);
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
                  <TableRow>
                    <TableCell className="font-medium text-muted-foreground">
                      Is Verified Student
                    </TableCell>
                    <TableCell
                      className={cn("text-primary text-right", {
                        "text-green-500": match.isVerified,
                        "text-red-500": !match.isVerified,
                      })}
                    >
                      {match.isVerified ? "Yes" : "No"}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-muted-foreground">
                      Total Requests
                    </TableCell>
                    <TableCell
                      className={cn("text-right", {
                        "text-muted-foreground": match.numberOfRequests > 0,
                        "text-green-500": match.numberOfRequests === 0,
                      })}
                    >
                      {match.numberOfRequests}
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
  id,
  match,
  className,
  onRequestOpen,
}: {
  id: Id<"swapper">;
  match: SwapCourseRequestMatch;
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
    statusElement = <span className="text-sm text-primary">Request</span>;
  }

  return (
    <button
      // key={match.id}
      onClick={() => onRequestOpen?.(id)}
      className={cn(
        "flex flex-row gap-2 px-2.5 py-2 items-center justify-between",
        {
          "bg-primary/10": match.isPerfectMatch,
        },
        className
      )}
    >
      <div className="flex flex-row gap-2 items-center justify-between">
        <p className="text-sm text-foreground">{match.index}</p>
        <div className="flex flex-row items-center">
          {match.isVerified && <BadgeCheck className="size-4 text-green-500" />}
          {match.numberOfRequests > 0 && (
            <Badge variant="outline" className="text-muted-foreground">
              {match.numberOfRequests} Requested
            </Badge>
          )}
        </div>
      </div>
      <div className="flex flex-row gap-2 items-center">
        <div className="flex flex-row gap-1 items-center">
          {statusElement}
          <ArrowRight className="size-4 text-primary" />
        </div>
      </div>
    </button>
  );
}

export function CourseSwapMatches({
  courseId,
  name,
  code,
}: {
  courseId: Id<"courses">;
  name: string;
  code: string;
}) {
  const requestsQuery = useQuery(api.tasks.getCourseRequestAndMatches, {
    courseId,
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
    const match = requestsQuery.matches.find(
      (match) => match.id === bottomSheetMatchItem.id
    );
    if (!match) return null;
    return {
      id: bottomSheetMatchItem.id,
      course: {
        id: requestsQuery.course.id,
        haveIndex: requestsQuery.course.haveIndex,
        hasSwapped: requestsQuery.course.hasSwapped,
        code,
        name,
      },
      match,
    };
  }, [bottomSheetMatchItem?.id, requestsQuery, code, name]);

  let matchesElement = null;
  if (requestsQuery === undefined) {
    matchesElement = <Skeleton className="h-48 w-full" />;
  } else if (requestsQuery.matches.length > 0) {
    const disabled = requestsQuery.course.hasSwapped;
    matchesElement = (
      <div className="w-full flex flex-col bg-card border border-border rounded-md py-1 text-sm">
        {requestsQuery.matches.map((match, index) => (
          <SwapItemMatch
            id={match.id}
            key={match.id}
            match={match}
            className={cn({
              "opacity-50": disabled,
              "border-b border-border":
                index !== requestsQuery.matches.length - 1,
            })}
            onRequestOpen={() =>
              setBottomSheetMatchItem({ id: match.id, isOpen: true })
            }
          />
        ))}
      </div>
    );
  } else {
    matchesElement = (
      <div className="w-full flex flex-col items-center justify-center bg-card border border-border rounded-md py-4 text-sm">
        <div className="text-center text-sm text-muted-foreground">
          No matches yet {"):"}
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
              <TableCell className="font-medium text-muted-foreground">
                Your Index
              </TableCell>
              <TableCell className="text-foreground text-right">
                {requestsQuery.course.haveIndex}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium text-muted-foreground">
                Want Index
              </TableCell>
              <TableCell className="text-foreground text-right">
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
          <h2 className="text-base font-bold">Your Request</h2>
          <Link
            href={`/swap/${code}/edit?backTo=${encodeURIComponent(window.location.href)}`}
          >
            <Button variant="outline">
              <Pencil className="size-3.5" />
              Edit
            </Button>
          </Link>
        </div>
        {yourRequestElement}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-row gap-2 items-center justify-between">
          <h2 className="text-base font-bold">Matches</h2>
          {requestsQuery && (
            <div className="flex flex-row gap-2 items-center">
              <p className="text-sm text-muted-foreground">Have Swapped?</p>
              <Checkbox
                className="size-5"
                checked={requestsQuery.course.hasSwapped}
                onCheckedChange={() => {
                  void toggleSwapRequestState.handle({
                    courseId,
                    hasSwapped: !requestsQuery.course.hasSwapped,
                  });
                }}
                disabled={toggleSwapRequestState.isPending}
              />
            </div>
          )}
        </div>
        {requestsQuery !== undefined && requestsQuery.course.hasSwapped && (
            <div className="text-sm text-muted-foreground border border-border rounded-md p-2 bg-card">
              <h2 className="text-foreground">
                You already found a swap for this course.
              </h2>
              <p className="text-muted-foreground">
                Keep this disabled if you{"'"}ve already found a match to avoid
                receiving swap requests.
              </p>
            </div>
          )}
        {matchesElement}
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
              isAlreadySwapped={requestsQuery?.course.hasSwapped ?? false}
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
