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
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useConvexMutationState } from "./use-convex-mutation-state";
import { useRouter } from "next/navigation";

const FormSchema = z.object({
  school: z.enum(schools, { message: "School is required" }),
  // Email must end in @e.ntu.edu.sg
  // email: z.email().refine((email) => email.endsWith("@e.ntu.edu.sg"), {
  //   message: "Email must end in @e.ntu.edu.sg",
  // }),
});

export function OnboardForm() {
  const onboard = useMutation(api.tasks.onboard);
  const { handle, error, isSuccess, isPending } =
    useConvexMutationState(onboard);
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      school: schools[0],
      // email: "",
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

        <div className="w-full flex justify-end">
          <Button
            type="submit"
            className="h-10 w-fit"
            disabled={isPending || isSuccess}
          >
            Done
          </Button>
        </div>
      </div>
    </form>
  );
}
