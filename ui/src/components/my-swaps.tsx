"use client";

import { trpc } from "@/server/client";
import { Skeleton } from "./ui/skeleton";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "./ui/badge";

export function MySwaps() {
  const requestsQuery = trpc.swaps.getAllRequests.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  if (requestsQuery.isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  const data = requestsQuery.data ?? [];
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
            <Link
              href={`/app/swap/${request.course.code}`}
              key={request.course.id}
            >
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

// export function MySwaps() {
//   const requestsAndMatchesQuery =
//     trpc.swaps.getAllRequestsAndMatches.useQuery();

//   if (requestsAndMatchesQuery.isLoading) {
//     return <Skeleton className="h-48 w-full" />;
//   }

//   if (!requestsAndMatchesQuery.data) {
//     return (
//       <div className="text-center text-sm text-muted-foreground">No data</div>
//     );
//   }

//   return (
//     <div className="w-full flex flex-col gap-8">
//       {requestsAndMatchesQuery.data.map((request) => (
//         <div key={request.course.id} className="flex flex-col gap-2">
//           <div className="flex flex-row gap-4 items-end justify-between">
//             <h2 className="text-base text-muted-foreground font-bold">
//               {request.course.code} {request.course.name}
//             </h2>

//             <Link href={`/app/swap/${request.course.code}`}>
//               <Button variant="secondary" size="sm">
//                 Edit
//               </Button>
//             </Link>
//           </div>
//           <div className="flex flex-col rounded-md bg-card py-0.5 border border-border">
//             {request.matches.length > 0 ? (
//               request.matches.map((match) => (
//                 <SwapItemMatch
//                   id={match.id}
//                   key={match.id}
//                   course={request.course}
//                   match={match}
//                 />
//               ))
//             ) : (
//               <div className="text-sm text-muted-foreground w-full text-center py-2">
//                 No matches yet {"):"}
//               </div>
//             )}
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }
