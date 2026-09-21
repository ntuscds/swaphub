import { env } from "@/lib/env";
import { notFound } from "next/navigation";

export default async function E2ETelegramPage({
  searchParams,
}: {
  searchParams: Promise<{ command?: string }>;
}) {
  if (!env.E2E_MODE) notFound();
  const { command = "" } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">E2E Telegram</h1>
        <p className="text-sm text-muted-foreground">Link a local Telegram identity through the real bot webhook.</p>
      </div>
      <form action="/api/e2e/telegram/link" method="post" className="flex flex-col gap-4">
        <input type="hidden" name="command" value={command} />
        <label className="flex flex-col gap-2 text-sm font-medium">
          Telegram username
          <input name="username" required placeholder="tele_albert" className="h-10 rounded-md border border-input bg-background px-3" />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Telegram user ID
          <input name="userId" required inputMode="numeric" className="h-10 rounded-md border border-input bg-background px-3" />
        </label>
        <button className="h-10 rounded-md bg-primary px-4 text-primary-foreground">Link account</button>
      </form>
    </main>
  );
}
