"use client";

import { api } from "../../convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import { ScrollArea } from "./ui/scroll-area";
import { SelectSchoolForm } from "./onboard-form";
import { useStableQuery } from "./use-stable-query";
import { useSelf } from "./providers";

export function AuthGuard({ children }: { children?: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();

  const { self } = useSelf();

  if (self === undefined) {
    return (
      <div className="flex items-center justify-center h-screen p-4">
        <div className="w-full max-w-xs rounded-2xl border border-border bg-card/70 p-6 shadow-lg">
          <div className="flex items-center justify-center gap-1.5 h-8">
            <div
              className="auth-loader-bar w-1.5 h-3 rounded-full bg-primary/70"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="auth-loader-bar w-1.5 h-5 rounded-full bg-primary/80"
              style={{ animationDelay: "100ms" }}
            />
            <div
              className="auth-loader-bar w-1.5 h-7 rounded-full bg-primary"
              style={{ animationDelay: "200ms" }}
            />
            <div
              className="auth-loader-bar w-1.5 h-5 rounded-full bg-primary/80"
              style={{ animationDelay: "300ms" }}
            />
            <div
              className="auth-loader-bar w-1.5 h-3 rounded-full bg-primary/70"
              style={{ animationDelay: "400ms" }}
            />
          </div>
          <p className="mt-4 text-center text-sm font-medium text-foreground">
            Setting things up... {self ? "true" : "false"}
          </p>
          <p className="mt-1 text-center text-xs text-muted-foreground">
            Checking your account
          </p>
        </div>
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
                  Let's get you onboarded!!!
                </p>
              </div>

              <SelectSchoolForm />
            </div>
          </div>
        </ScrollArea>
      </main>
    );
  }

  return children;
}
