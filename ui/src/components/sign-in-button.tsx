"use client";

import { Button } from "./ui/button";

export function SignInButton({ callbackUrl }: { callbackUrl: string }) {
  return (
    <Button
      type="button"
      size="lg"
      className="w-fit px-4 py-2.5 h-fit flex flex-row gap-2 lg:gap-2.5 items-center bg-background-200 dark:bg-background-800"
      onClick={() => {
        window.location.href = `/api/auth/microsoft/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="size-4 lg:size-6"
        viewBox="0 0 23 23"
      >
        <path fill="#f35325" d="M1 1h10v10H1z" />
        <path fill="#81bc06" d="M12 1h10v10H12z" />
        <path fill="#05a6f0" d="M1 12h10v10H1z" />
        <path fill="#ffba08" d="M12 12h10v10H12z" />
      </svg>
      Sign in with Microsoft
    </Button>
  );
}
