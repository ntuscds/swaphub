"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CurrentAcadYear } from "@/lib/acad";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

function formatAge(ageMs: number) {
  const seconds = Math.floor(ageMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") {
    return (
      <Badge variant="default" className="text-yellow-500 bg-yellow-700/30">
        Pending
      </Badge>
    );
  }
  if (status === "accepted") {
    return (
      <Badge variant="default" className="text-green-500 bg-green-700/30">
        Accepted
      </Badge>
    );
  }
  return (
    <Badge variant="default" className="text-red-500 bg-red-700/30">
      Cancelled
    </Badge>
  );
}

export function History({ courseCode }: { courseCode: string }) {
  const historyQuery = useQuery(api.tasks.getCourseRequestHistory, {
    courseCode,
    acadYear: CurrentAcadYear,
  });

  if (historyQuery === undefined) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-base lg:text-lg xl:text-xl font-bold">History</h2>
      {historyQuery.history.length === 0 ? (
        <div className="w-full flex flex-col items-center justify-center bg-card border border-border rounded-md py-4 text-sm">
          <div className="text-center text-sm lg:text-base xl:text-lg text-muted-foreground">
            No history yet {"):"}
          </div>
        </div>
      ) : (
        <div className="w-full flex flex-col bg-card border border-border rounded-md py-1 text-sm">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead
                  className="font-medium text-sm lg:text-base text-muted-foreground uppercase"
                  colSpan={2}
                >
                  Participants
                </TableHead>
                <TableHead
                  className="font-medium text-sm lg:text-base text-muted-foreground uppercase"
                  colSpan={1}
                >
                  Status
                </TableHead>
                <TableHead
                  className="font-medium text-sm lg:text-base text-muted-foreground text-right uppercase"
                  colSpan={1}
                >
                  Age
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyQuery.history.map((item, index) => (
                <TableRow
                  key={item.id}
                  className={
                    index !== historyQuery.history.length - 1
                      ? "border-b border-border"
                      : undefined
                  }
                >
                  <TableCell
                    className="text-sm lg:text-base text-foreground truncate"
                    colSpan={2}
                  >
                    {item.participants.join(", ")}
                  </TableCell>
                  <TableCell className="text-sm lg:text-base" colSpan={1}>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell
                    className="text-right text-sm lg:text-base text-muted-foreground"
                    colSpan={1}
                  >
                    {formatAge(item.ageMs)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
