"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Skeleton } from "./ui/skeleton";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "./ui/badge";
import { useStableQuery } from "./use-stable-query";

export function MySwaps() {
  const data = useStableQuery(api.tasks.getAllRequests);

  if (data === undefined) {
    return (
      <div className="w-full flex flex-col gap-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }
  return (
    <div className="w-full flex flex-col bg-card border border-border rounded-md py-1 text-sm">
      {data.length > 0 ? (
        data.map((request, index) => {
          let tag = null;
          if (request.hasSwapped) {
            tag = (
              <Badge
                variant="outline"
                className="bg-green-500/15 text-green-500"
              >
                Swapped!
              </Badge>
            );
          } else if (request.pendingRequestCount > 0) {
            tag = (
              <Badge
                variant="outline"
                className="bg-yellow-500/15 text-yellow-500"
              >
                {request.pendingRequestCount} pending
              </Badge>
            );
          } else if (request.matchCount > 0) {
            tag = (
              <Badge variant="outline" className="bg-primary/15 text-primary">
                {request.matchCount} matches
              </Badge>
            );
          }
          return (
            <Link href={`/swap/${request.course.code}`} key={request.course.id}>
              <div
                className={cn(
                  "flex flex-row gap-2 items-center justify-between px-2.5 py-2",
                  {
                    "border-b border-border": index !== data.length - 1,
                  }
                )}
              >
                <span className="flex-1 truncate text-foreground">
                  {request.course.code} {request.course.name}
                </span>
                {tag}
                <ArrowRight className="size-4 text-primary" />
              </div>
            </Link>
          );
        })
      ) : (
        <div className="text-center text-sm text-muted-foreground p-4">
          No requests yet! Click <span className="text-primary">New Swap</span>{" "}
          below to request a swap.
        </div>
      )}
    </div>
  );
}
