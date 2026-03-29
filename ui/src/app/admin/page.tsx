"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { setMockUserEmail } from "./actions";

export default function AdminPage() {
  const self = useQuery(api.tasks.getSelf, {});
  const mockAccounts = useQuery(api.tasks.getAllMockAccounts, {});
  const duplicateAccount = useMutation(api.tasks.duplicateAccount);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState<string | null>(null);

  const accountOptions = useMemo(() => {
    const emails = new Set<string>();
    if (self?.email) {
      emails.add(self.email);
    }
    for (const account of mockAccounts ?? []) {
      emails.add(account.email);
    }
    return Array.from(emails);
  }, [mockAccounts, self?.email]);

  return (
    <main className="p-6 flex flex-col gap-8 max-w-2xl mx-auto">
      <section className="border rounded-md p-4 flex flex-col gap-3">
        <h1 className="text-xl font-semibold">Admin Mode</h1>
        <p className="text-sm text-muted-foreground">
          Temporary tooling to duplicate your account and assume another user.
        </p>
      </section>

      <section className="border rounded-md p-4 flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Duplicate Current Account</h2>
        <p className="text-sm text-muted-foreground">
          Creates a mock account clone of your current account.
        </p>
        <div>
          <Button
            type="button"
            disabled={isDuplicating}
            onClick={async () => {
              setDuplicateMessage(null);
              setIsDuplicating(true);
              try {
                await duplicateAccount({});
                setDuplicateMessage("Duplicated account successfully.");
              } catch {
                setDuplicateMessage("Failed to duplicate account.");
              } finally {
                setIsDuplicating(false);
              }
            }}
          >
            {isDuplicating ? "Duplicating..." : "Duplicate Account"}
          </Button>
        </div>
        {duplicateMessage ? (
          <p className="text-sm text-muted-foreground">{duplicateMessage}</p>
        ) : null}
      </section>

      <section className="border rounded-md p-4 flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Assume User</h2>
        <p className="text-sm text-muted-foreground">
          Select an account email and set `_MOCK_USER_EMAIL` cookie.
        </p>
        <form action={setMockUserEmail} className="flex flex-col gap-3">
          <select
            name="mockUserEmail"
            className="border rounded-md px-3 py-2 bg-background"
            defaultValue=""
          >
            <option value="">(Clear override)</option>
            {accountOptions.map((email) => (
              <option key={email} value={email}>
                {email}
              </option>
            ))}
          </select>
          <div>
            <Button type="submit">Set Assumed User</Button>
          </div>
        </form>
      </section>
    </main>
  );
}
