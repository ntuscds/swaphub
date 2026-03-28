"use client";
import { schools } from "@/lib/types";
import z from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field, FieldError, FieldLabel } from "./ui/field";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Button } from "./ui/button";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  useConvexActionState,
  useConvexMutationState,
} from "./use-convex-mutation-state";
import { retrieveRawInitData } from "@tma.js/sdk-react";
import { useStableQuery } from "./use-stable-query";
import { Skeleton } from "./ui/skeleton";

const FormSchema = z.object({
  school: z.enum(schools, { message: "School is required" }),
});

export function SelectSchoolForm() {
  const selectSchool = useMutation(api.tasks.selectSchool);
  const { handle, error, isSuccess, isPending } =
    useConvexMutationState(selectSchool);
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      school: schools[0],
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    void handle({ school: data.school });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-8"
    >
      <Controller
        name="school"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="form-rhf-school">
              Which School are you from?
            </FieldLabel>
            <Combobox
              items={schools}
              onValueChange={field.onChange}
              value={field.value}
            >
              <ComboboxInput
                className="h-10"
                placeholder="Select your school"
              />
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

        {isSuccess && (
          <Alert variant="default">
            <AlertTitle>Success!</AlertTitle>
            <AlertDescription>
              Redirecting to verification page...
            </AlertDescription>
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

export function VerifyTelegramForm() {
  const requestLinkTelegramAccount = useAction(
    api.actions.requestLinkTelegramAccount
  );
  const { handle, error, data, isPending } = useConvexActionState<
    {
      success: boolean;
      email: string;
      code: string;
    },
    typeof requestLinkTelegramAccount
  >(requestLinkTelegramAccount);

  let url: string | undefined;
  if (data) {
    const command = `/link ${data.email} ${data.code}`;
    url = `https://t.me/Findex_ntu_bot?text=${encodeURIComponent(command)}`;
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-base lg:text-lg font-semibold max-w-md">
        Connect your Telegram account to receive swap requests.
      </h2>
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error!</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button
        type="button"
        size="lg"
        className="w-fit px-4 py-2.5 h-fit flex flex-row gap-2 lg:gap-2.5 items-center bg-background-200 dark:bg-background-800"
        disabled={isPending}
        onClick={async () => {
          let rawInitData = undefined;
          try {
            rawInitData = retrieveRawInitData() as string;
          } catch (error) {
            // Ignore error
          }

          const result = await handle({ telegramRawInitData: rawInitData });
          if (!result) {
            return;
          }
          if (rawInitData) {
            return;
          }
          const command = `/link ${result.email} ${result.code}`;
          const url = `https://t.me/Findex_ntu_bot?text=${encodeURIComponent(command)}`;
          // Open in new tab
          /* https://t.me/Findex_ntu_bot?text=/hello%20world# */
          window.open(url, "_blank");
        }}
      >
        <svg
          className="size-4 lg:size-6"
          viewBox="0 0 256 256"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid"
        >
          <g>
            <path
              d="M128,0 C57.307,0 0,57.307 0,128 L0,128 C0,198.693 57.307,256 128,256 L128,256 C198.693,256 256,198.693 256,128 L256,128 C256,57.307 198.693,0 128,0 L128,0 Z"
              fill="#40B3E0"
            ></path>
            <path
              d="M190.2826,73.6308 L167.4206,188.8978 C167.4206,188.8978 164.2236,196.8918 155.4306,193.0548 L102.6726,152.6068 L83.4886,143.3348 L51.1946,132.4628 C51.1946,132.4628 46.2386,130.7048 45.7586,126.8678 C45.2796,123.0308 51.3546,120.9528 51.3546,120.9528 L179.7306,70.5928 C179.7306,70.5928 190.2826,65.9568 190.2826,73.6308"
              fill="#FFFFFF"
            ></path>
            <path
              d="M98.6178,187.6035 C98.6178,187.6035 97.0778,187.4595 95.1588,181.3835 C93.2408,175.3085 83.4888,143.3345 83.4888,143.3345 L161.0258,94.0945 C161.0258,94.0945 165.5028,91.3765 165.3428,94.0945 C165.3428,94.0945 166.1418,94.5735 163.7438,96.8115 C161.3458,99.0505 102.8328,151.6475 102.8328,151.6475"
              fill="#D2E5F1"
            ></path>
            <path
              d="M122.9015,168.1154 L102.0335,187.1414 C102.0335,187.1414 100.4025,188.3794 98.6175,187.6034 L102.6135,152.2624"
              fill="#B5CFE4"
            ></path>
          </g>
        </svg>
        Link Telegram
      </Button>

      {data && data.code !== "" && (
        <>
          <Alert>
            <AlertTitle>
              1. Go to Telegram and search for{" "}
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-500 no-underline"
              >
                @Findex_ntu_bot
              </a>
            </AlertTitle>
          </Alert>
          <Alert>
            <AlertTitle className="max-w-xl">
              2. Run the command{" "}
              <span className="text-primary-500">
                /link <code>{data?.email}</code> <code>{data?.code}</code>
              </span>
              . Will expire in 10 minutes.
            </AlertTitle>
          </Alert>
        </>
      )}
    </div>
  );
}

export function OnboardingForm({
  verifyTelegramNode,
  selectSchoolNode,
  loadingNode,
}: {
  verifyTelegramNode: React.ReactNode;
  selectSchoolNode: React.ReactNode;
  loadingNode: React.ReactNode;
}) {
  const getSelfQuery = useStableQuery(api.tasks.getSelf);

  if (getSelfQuery === undefined) {
    return loadingNode;
  }

  if (getSelfQuery === null) {
    return verifyTelegramNode;
  }

  return selectSchoolNode;
}
