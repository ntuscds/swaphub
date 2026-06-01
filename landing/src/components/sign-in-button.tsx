import { Button } from "./ui/button";

export function SignInButton() {
  const signInUrl = `https://localhost:3000/api/auth/microsoft/login?callbackUrl=${encodeURIComponent("/onboard")}`;

  return (
    <Button
      type="button"
      size="lg"
      render={
        <a
          href={signInUrl}
          className="inline-flex w-full sm:w-fit shrink-0 items-center justify-center rounded-lg border border-transparent px-4 py-2.5 h-fit flex-row gap-2 lg:gap-2.5 text-sm font-medium bg-background-300 dark:bg-background-800 text-foreground transition-all hover:opacity-90"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="size-4 lg:size-6"
            viewBox="0 0 23 23"
          >
            <path fill="#f35325" d="M1 1h10v10H1z"></path>
            <path fill="#81bc06" d="M12 1h10v10H12z"></path>
            <path fill="#05a6f0" d="M1 12h10v10H1z"></path>
            <path fill="#ffba08" d="M12 12h10v10H12z"></path>
          </svg>
          Sign in with Microsoft
        </a>
      }
    />
  );
}
