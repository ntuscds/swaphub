"use client";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { api } from "../../../../convex/_generated/api";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const requestsQuery = useQuery(api.tasks.testRequest, {});
  console.log(requestsQuery);

  return (
    <Button
      type="button"
      onClick={() => {
        window.location.href = `/api/auth/microsoft/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
      }}
    >
      Sign in with Microsoft
    </Button>
  );
}
