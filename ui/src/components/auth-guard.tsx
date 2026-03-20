"use client";

import { api } from "../../convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import { Skeleton } from "./ui/skeleton";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useRawInitData } from "@tma.js/sdk-react";
import { ScrollArea } from "./ui/scroll-area";
import { OnboardForm } from "./onboard-form";

export function Guard({ children }: { children?: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const self = useQuery(api.tasks.getSelf);

  if (isLoading || self === undefined) {
    return (
      <div className="flex items-center justify-center h-screen p-4">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (!isAuthenticated || self === null) {
    return (
      <main>
        <ScrollArea className="bg-background text-foreground h-screen p-4">
          <div className="flex flex-col items-center">
            <div className="flex flex-col gap-12 py-12 max-w-4xl w-full">
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold">Hey! 👋</h1>
                <p className="text-sm text-muted-foreground">
                  Let's get you onboarded!!!{" "}
                  {isAuthenticated ? "Authenticated" : "Not authenticated"}
                </p>
              </div>

              <OnboardForm />
            </div>
          </div>
        </ScrollArea>
      </main>
    );
  }

  return children;
}
