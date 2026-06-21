"use client";

import { api } from "../../../convex/_generated/api";
import { useQuery, useMutation, useAction } from "convex/react";
import { HydrationSafeScrollArea } from "@/components/hydration-safe-scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Pencil, X, Check, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { schools } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge"; // used in stats cards
import { getProfileImageUrl } from "@/lib/user";
import { env } from "@/lib/env";
import {
  useConvexActionState,
  useConvexMutationState,
} from "@/components/use-convex-mutation-state";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";

function RelinkTelegramButton() {
  const requestLinkTelegramAccount = useAction(
    api.actions.requestLinkTelegramAccount
  );
  const { handle, error, isPending } = useConvexActionState<
    typeof requestLinkTelegramAccount
  >(requestLinkTelegramAccount);

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-fit gap-2"
        disabled={isPending}
        onClick={async () => {
          const result = await handle({ telegramRawInitData: undefined });
          if (!result) return;
          const command = `/link ${result.email} ${result.code}`;
          const telegramUrl = `https://t.me/${env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}?text=${encodeURIComponent(command)}`;
          const width = 600;
          const height = 700;
          const left = Math.round(
            window.screenX + (window.outerWidth - width) / 2
          );
          const top = Math.round(
            window.screenY + (window.outerHeight - height) / 2
          );
          window.open(
            telegramUrl,
            "telegram-relink",
            `noopener,noreferrer,width=${width},height=${height},left=${left},top=${top}`
          );
        }}
      >
        <svg
          className="size-3.5"
          viewBox="0 0 256 256"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M128,0C57.307,0,0,57.307,0,128s57.307,128,128,128s128-57.307,128-128S198.693,0,128,0z"
            fill="#40B3E0"
          />
          <path
            d="M190.283,73.631L167.421,188.898c0,0-3.197,7.994-11.99,4.157l-52.758-40.448l-19.184-9.272l-32.294-10.872c0,0-4.956-1.758-5.436-5.595c-0.479-3.837,5.595-5.915,5.595-5.915l128.376-50.401C179.73,70.552,190.283,65.957,190.283,73.631z"
            fill="#FFFFFF"
          />
          <path
            d="M98.618,187.604c0,0-1.54-0.144-3.459-6.22c-1.918-6.076-11.67-38.05-11.67-38.05l77.537-49.24c0,0,4.477-2.718,4.317,0c0,0,0.799,0.479-1.599,2.717c-2.398,2.238-60.913,54.834-60.913,54.834"
            fill="#D2E5F1"
          />
          <path
            d="M122.901,168.115l-20.868,19.026c0,0-1.631,1.238-3.416,0.463l3.996-35.34"
            fill="#B5CFE4"
          />
        </svg>
        {isPending ? "Opening Telegram…" : "Re-link Telegram"}
      </Button>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

const FormSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, { message: "Username must not be empty" })
    .max(24, { message: "Username must be <= 24 characters" })
    .regex(/^[a-zA-Z0-9 _-]+$/, {
      message: "Username must be alphanumeric and not empty",
    }),
  school: z.enum(schools, { message: "School is required" }),
});

function EditProfileForm({
  currentUsername,
  currentSchool,
  onCancel,
  onSaved,
}: {
  currentUsername: string;
  currentSchool: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const setProfile = useMutation(api.tasks.setProfile);
  const { handle, error, isSuccess, isPending } = useConvexMutationState(
    setProfile,
    {
      onSuccess: async () => {
        onSaved();
      },
    }
  );
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      username: currentUsername ?? "",
      school: schools.includes(currentSchool as (typeof schools)[number])
        ? (currentSchool as (typeof schools)[number])
        : schools[0],
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    void handle({ username: data.username, school: data.school });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4 p-4"
    >
      <Controller
        name="username"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel
              htmlFor="form-rhf-username"
              className="text-xs text-muted-foreground font-medium uppercase tracking-wide"
            >
              Username
            </FieldLabel>
            <Input
              id="form-rhf-username"
              placeholder="Enter your username"
              className="h-10"
              value={field.value}
              onChange={field.onChange}
            />
            {fieldState.error && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="school"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel
              htmlFor="form-rhf-school"
              className="text-xs text-muted-foreground font-medium uppercase tracking-wide"
            >
              School
            </FieldLabel>
            <Combobox
              items={schools}
              onValueChange={field.onChange}
              value={field.value}
            >
              <ComboboxInput className="h-9" placeholder="Select your school" />
              <ComboboxContent>
                <ComboboxEmpty>No schools found.</ComboboxEmpty>
                <ComboboxList>
                  {(item) => (
                    <ComboboxItem key={item} value={item}>
                      {item}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <div className="flex flex-col gap-2">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error!</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="w-full flex">
          <Button
            type="submit"
            className="h-10 w-fit px-4"
            disabled={isPending || isSuccess}
          >
            Done
          </Button>
        </div>
      </div>
    </form>
  );
}

export default function ProfilePage() {
  const self = useQuery(api.tasks.getSelf);
  const requests = useQuery(
    api.tasks.getAllRequests,
    self === undefined || self === null ? "skip" : {}
  );
  const [isEditing, setIsEditing] = useState(false);

  const activeSwapRequests =
    requests?.filter((r) => r.type !== "swapped").length ?? 0;
  const matchesFound =
    requests?.filter((r) => r.type === "swapped").length ?? 0;

  const isLoading =
    self === undefined || (self !== null && requests === undefined);
  const username = self && "username" in self ? (self.username ?? "") : "";
  const school = self && "school" in self ? (self.school ?? "") : "";
  const telegramHandle = self && "handle" in self ? (self.handle ?? "") : "";

  return (
    <HydrationSafeScrollArea className="h-screen-safe">
      <div className="flex flex-col items-center">
        <div className="flex flex-col gap-6 py-4 lg:py-6 xl:py-8 max-w-2xl w-full px-4 pb-20">
          {/* ── Hero card ── */}
          <div className="w-full flex flex-col bg-card border border-border rounded-md overflow-hidden mt-10 lg:mt-0">
            {/* Coloured banner */}
            <div className="h-16 bg-linear-to-r from-primary-700 via-primary-500 to-primary-400" />
            {/* Avatar + name row */}
            <div className="px-5 pb-5 -mt-8 flex flex-row items-end gap-4">
              <div className="size-16 rounded-full border-4 border-card bg-muted overflow-hidden shrink-0">
                {isLoading ? (
                  <Skeleton className="size-full rounded-full" />
                ) : username ? (
                  <img
                    src={getProfileImageUrl(username)}
                    alt={username}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="size-full flex items-center justify-center">
                    <UserRound className="size-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="pb-1 flex flex-col gap-0.5 min-w-0">
                {isLoading ? (
                  <>
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3.5 w-48 mt-1" />
                  </>
                ) : (
                  <>
                    <p className="text-base lg:text-lg font-bold text-foreground truncate">
                      {username || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {self?.email ?? "—"}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Stats ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 bg-card border border-border rounded-md p-4">
              <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Active Swaps
              </span>
              {isLoading ? (
                <Skeleton className="h-8 w-10" />
              ) : (
                <div className="flex flex-row items-end gap-2">
                  <span className="text-2xl lg:text-3xl font-bold text-yellow-500 dark:text-yellow-400">
                    {activeSwapRequests}
                  </span>
                  <Badge
                    variant="outline"
                    className="mb-0.5 bg-yellow-100 dark:bg-yellow-500/15 text-yellow-900 dark:text-yellow-500 border-yellow-300 dark:border-none"
                  >
                    pending
                  </Badge>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1 bg-card border border-border rounded-md p-4">
              <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Swapped
              </span>
              {isLoading ? (
                <Skeleton className="h-8 w-10" />
              ) : (
                <div className="flex flex-row items-end gap-2">
                  <span className="text-2xl lg:text-3xl font-bold text-green-500 dark:text-green-400">
                    {matchesFound}
                  </span>
                  <Badge
                    variant="outline"
                    className="mb-0.5 bg-green-100 dark:bg-green-500/15 text-green-900 dark:text-green-500 border-green-300 dark:border-none"
                  >
                    swapped!
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* ── Account details ── */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-row items-center justify-between">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Account Details
              </p>
              {!isLoading && !isEditing && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="size-3" /> Edit
                </Button>
              )}
            </div>
            <div className="w-full flex flex-col bg-card border border-border rounded-md text-sm">
              {isLoading ? (
                <div className="flex flex-col gap-3 p-4">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ) : (
                <>
                  {/* Email */}
                  <div className="flex flex-row items-center justify-between gap-4 px-4 py-3 border-b border-border">
                    <span className="text-sm text-muted-foreground shrink-0">
                      Email
                    </span>
                    <span className="text-sm font-medium text-right break-all min-w-0">
                      {self?.email ?? "—"}
                    </span>
                  </div>

                  {/* Telegram */}
                  <div className="flex flex-col px-4 py-3 gap-3 border-b border-border">
                    <div className="flex flex-row items-center justify-between gap-4">
                      <span className="text-sm text-muted-foreground shrink-0">
                        Telegram
                      </span>
                      <span className="text-sm font-medium text-right break-all min-w-0">
                        {telegramHandle ? `@${telegramHandle}` : "—"}
                      </span>
                    </div>
                    <RelinkTelegramButton />
                  </div>

                  {/* Username + School — editable */}
                  {isEditing ? (
                    <EditProfileForm
                      currentUsername={username}
                      currentSchool={school}
                      onCancel={() => setIsEditing(false)}
                      onSaved={() => setIsEditing(false)}
                    />
                  ) : (
                    <>
                      <div className="flex flex-row items-center justify-between gap-4 px-4 py-3 border-b border-border">
                        <span className="text-sm text-muted-foreground shrink-0">
                          Username
                        </span>
                        <span className="text-sm font-medium text-right break-all min-w-0">
                          {username || "—"}
                        </span>
                      </div>
                      <div className="flex flex-row items-center justify-between gap-4 px-4 py-3">
                        <span className="text-sm text-muted-foreground shrink-0">
                          School
                        </span>
                        <span className="text-sm font-medium text-right">
                          {school || "—"}
                        </span>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Quick Links ── */}
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Quick Links
            </p>
            <div className="w-full flex flex-col bg-card border border-border rounded-md text-sm">
              <Link
                href="/swap"
                className="flex flex-row items-center justify-between px-4 py-3 border-b border-border hover:bg-muted transition-colors"
              >
                <span>My Swaps</span>
                <ArrowRight className="size-4 text-primary-500" />
              </Link>
              <a
                href="/api/auth/microsoft/logout"
                className="flex flex-row items-center justify-between px-4 py-3 hover:bg-muted transition-colors"
              >
                <span>Sign Out and Go to Home</span>
                <ArrowRight className="size-4 text-primary-500" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </HydrationSafeScrollArea>
  );
}
