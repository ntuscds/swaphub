import { env } from "@/lib/env";
import { notFound } from "next/navigation";

export default async function E2EAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  if (!env.E2E_MODE) notFound();
  const { callbackUrl = "/onboard" } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">E2E Microsoft sign-in</h1>
        <p className="text-sm text-muted-foreground">
          This local adapter creates the same signed application session as the
          Microsoft callback without contacting Microsoft.
        </p>
      </div>
      <form action="/api/e2e/auth" method="post" className="flex flex-col gap-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <label className="flex flex-col gap-2 text-sm font-medium">
          Email
          <input name="email" type="email" required autoFocus className="h-10 rounded-md border border-input bg-background px-3" />
        </label>
        <button className="h-10 rounded-md bg-primary px-4 text-primary-foreground">Continue</button>
      </form>
    </main>
  );
}
