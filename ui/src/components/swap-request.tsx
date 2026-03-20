"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "./ui/button";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useDebounce } from "use-debounce";
import Fuse from "fuse.js";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItemBase,
  CommandList,
  CommandSeparator,
} from "./ui/command";
import { ChevronsUpDown, Send } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field, FieldError, FieldLabel } from "./ui/field";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery } from "convex/react";
import { api as convexApi } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useConvexMutationState } from "./use-convex-mutation-state";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Skeleton } from "./ui/skeleton";

export type CourseIndex = {
  id: string;
  index: string;
  haveCount: number;
  wantCount: number;
};

function SelectCourseIndexCommand({
  value,
  onChange,
  courseIndexes,
  limit,
}: {
  value: CourseIndex[];
  onChange: (value: CourseIndex[]) => void;
  courseIndexes: CourseIndex[];
  limit: number;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 300);

  const fuse = useMemo(() => {
    return new Fuse(courseIndexes, {
      keys: [
        {
          name: "index",
          weight: 1,
        },
      ],
    });
  }, [courseIndexes]);

  const filteredOptions = useMemo(() => {
    if (parentRef.current) {
      parentRef.current.scrollTo({
        top: 0,
        behavior: "instant",
      });
    }
    if (debouncedSearch === "") {
      return courseIndexes;
    }
    return fuse.search(debouncedSearch).map((r) => r.item);
  }, [fuse, debouncedSearch, parentRef]);

  const virtualizer = useVirtualizer({
    count: filteredOptions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
  });

  const virtualOptions = virtualizer.getVirtualItems();

  return (
    <Command shouldFilter={false}>
      <CommandInput
        placeholder="Search course index..."
        className="h-10 text-base"
        onValueChange={setSearch}
        ref={inputRef}
      />
      <CommandList
        ref={parentRef}
        style={{
          // height: `200px`,
          width: "100%",
          overflow: "auto",
          // height: 180,
        }}
        className="h-48"
      >
        <CommandEmpty>No course index found.</CommandEmpty>
        <CommandGroup
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
          className="p-0"
        >
          {virtualOptions.map((virtualItem) => {
            const courseIndex = filteredOptions[virtualItem.index];
            const isSelected = value?.some((v) => v.id === courseIndex.id);
            return (
              <CommandItemBase
                key={courseIndex.id}
                value={courseIndex.id}
                onSelect={() => {
                  if (limit === 1) {
                    if (isSelected) {
                      onChange([]);
                    } else {
                      onChange([courseIndex]);
                    }
                    // inputRef.current?.focus();
                    return;
                  }
                  onChange(
                    isSelected
                      ? value?.filter((v) => v.id !== courseIndex.id)
                      : [...(value || []), courseIndex]
                  );
                  // inputRef.current?.focus();
                }}
                style={{
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                className="py-0 absolute top-0 left-0 right-0"
                selected={isSelected}
                disabled={value?.length >= limit && !isSelected && limit > 1}
              >
                <div className="py-1.5 px-2 w-full truncate flex flex-row gap-2 justify-between items-center">
                  <span className="text-sm">{courseIndex.index}</span>

                  <div className="flex flex-row gap-2">
                    {courseIndex.wantCount > 0 && (
                      <Badge variant="secondary">
                        {courseIndex.wantCount} want
                      </Badge>
                    )}

                    {courseIndex.haveCount > 0 && (
                      <Badge variant="default">
                        {courseIndex.haveCount} have
                      </Badge>
                    )}
                  </div>
                </div>
              </CommandItemBase>
            );
          })}
        </CommandGroup>
      </CommandList>
      <CommandSeparator />
      {value.length >= limit && limit > 1 && (
        <div className="text-sm text-red-400 p-4">
          You can only select up to {limit} course indexes.
        </div>
      )}
    </Command>
  );
}

export function SelectCourseIndexCombobox({
  value,
  onChange,
  courseIndexes,
  limit,
  disabled,
}: {
  value: CourseIndex[];
  onChange: (value: CourseIndex[]) => void;
  courseIndexes: CourseIndex[];
  limit: number;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const [buttonWidth, setButtonWidth] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (buttonRef.current) {
      setButtonWidth(buttonRef.current.offsetWidth);
    }
    const callback = () => {
      if (buttonRef.current) {
        setButtonWidth(buttonRef.current.offsetWidth);
      }
    };
    window.addEventListener("resize", callback);
    return () => {
      window.removeEventListener("resize", callback);
    };
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            className="flex-row w-full h-12 border border-input rounded-md flex items-center justify-between px-3 truncate"
            disabled={disabled}
            // onClick={() => setOpen(true)}
            ref={buttonRef}
          >
            <span
              className={cn("flex flex-row gap-2", {
                "text-foreground": value !== null,
                "text-muted-foreground": value === null,
              })}
            >
              {value.length > 0
                ? `${value
                    .slice(0, 3)
                    .map((v) => v.index)
                    .join(
                      ", "
                    )} ${value.length > 3 ? `(+${value.length - 3})` : ""}`
                : "No Course Indexes Specified"}
            </span>
            <div className="flex flex-row gap-2 items-center">
              <ChevronsUpDown className="opacity-50" />
            </div>
          </Button>
        }
      />

      {/* https://github.com/shadcn-ui/ui/issues/1690 */}
      {/* <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]"> */}
      <PopoverContent className="p-0" style={{ width: buttonWidth }}>
        <SelectCourseIndexCommand
          value={value}
          onChange={onChange}
          courseIndexes={courseIndexes}
          limit={limit}
        />
      </PopoverContent>
    </Popover>
  );
}

const SwapRequestFormSchema = z.object({
  haveIndexId: z.string().min(1, {
    message: "Please select a course index you have.",
  }),
  wantIndexIds: z.array(z.string()).max(16),
});

export function SwapRequestFormWithPrefill({
  courseId,
  courseIndexes,
}: {
  courseId: Id<"courses">;
  courseIndexes: CourseIndex[];
}) {
  const request = useQuery(convexApi.tasks.getRequestForCourse, { courseId });
  if (request === undefined) {
    return <Skeleton className="h-48 w-full" />;
  }
  const defaultHave = request.haveIndex
    ? (courseIndexes.find((c) => c.index === request.haveIndex)?.id ?? "")
    : "";
  const defaultWants = request.wantIndexes
    .map((idx) => courseIndexes.find((c) => c.index === idx)?.id)
    .filter((id): id is string => Boolean(id));

  return (
    <SwapRequestForm
      key={`${defaultHave}:${[...defaultWants].sort().join(",")}`}
      courseId={courseId}
      courseIndexes={courseIndexes}
      defaultHaveIndexId={defaultHave}
      defaultWantIndexIds={defaultWants}
    />
  );
}

export function SwapRequestForm({
  courseId,
  courseIndexes,
  defaultHaveIndexId = "",
  defaultWantIndexIds = [],
}: {
  courseId: Id<"courses">;
  courseIndexes: CourseIndex[];
  defaultHaveIndexId?: string;
  defaultWantIndexIds?: string[];
}) {
  const router = useRouter();
  const setRequestMutation = useMutation(convexApi.tasks.setRequest);
  const {
    handle: setRequest,
    error,
    isSuccess,
    isPending,
  } = useConvexMutationState(setRequestMutation, {
    onSuccess: (data: { success: true; courseCode: string }) => {
      router.push(`/swap/${data.courseCode}`);
    },
  });
  const form = useForm<z.infer<typeof SwapRequestFormSchema>>({
    resolver: zodResolver(SwapRequestFormSchema),
    defaultValues: {
      haveIndexId: defaultHaveIndexId,
      wantIndexIds: defaultWantIndexIds,
    },
  });

  function onSubmit(data: z.infer<typeof SwapRequestFormSchema>) {
    void setRequest({
      courseId,
      haveIndex:
        courseIndexes.find((index) => index.id === data.haveIndexId)?.index ??
        "",
      wantIndexes: courseIndexes
        .filter((index) => data.wantIndexIds.includes(index.id))
        .map((index) => index.index),
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-8"
    >
      <Controller
        name="haveIndexId"
        control={form.control}
        render={({ field, fieldState }) => {
          const haveIndex = courseIndexes.find(
            (index) => index.id === field.value
          );
          return (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="form-rhf-school">
                What index do you have?
              </FieldLabel>
              <SelectCourseIndexCombobox
                value={haveIndex ? [haveIndex] : []}
                onChange={(value) => {
                  field.onChange(value[0]?.id ?? "");
                }}
                courseIndexes={courseIndexes}
                limit={1}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          );
        }}
      />
      <Controller
        name="wantIndexIds"
        control={form.control}
        render={({ field, fieldState }) => {
          const wantIndexes = courseIndexes.filter((index) =>
            field.value.includes(index.id)
          );
          return (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="form-rhf-school">
                Which indexes do you want?
              </FieldLabel>
              <SelectCourseIndexCombobox
                value={wantIndexes}
                onChange={(value) => field.onChange(value.map((v) => v.id))}
                courseIndexes={courseIndexes}
                limit={16}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          );
        }}
      />

      <div className="flex flex-col gap-2">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error!</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isSuccess && (
          <Alert variant="success">
            <AlertTitle>Success!</AlertTitle>
          </Alert>
        )}

        <div className="w-full flex justify-end">
          <Button
            type="submit"
            disabled={form.formState.isSubmitting || isPending}
          >
            <Send className="size-4" /> Request
          </Button>
        </div>
      </div>
    </form>
  );
}
