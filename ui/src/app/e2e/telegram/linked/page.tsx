import { env } from "@/lib/env";
import { notFound } from "next/navigation";

export default function LinkedPage() {
  if (!env.E2E_MODE) notFound();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6">
      <h1 className="text-2xl font-bold">Telegram account linked</h1>
      <p>You can close this window and return to SwapHub.</p>
    </main>
  );
}
