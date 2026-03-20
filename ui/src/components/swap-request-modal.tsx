"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
} from "./ui/command";
import { ChevronsUpDown, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";

type Course = {
  id: number;
  code: string;
  name: string;
};

function SelectCourseCommand({
  value,
  onChange,
  courses,
}: {
  value: Course | null;
  onChange: (value: Course) => void;
  courses: Course[];
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 300);

  const fuse = useMemo(() => {
    return new Fuse(courses, {
      keys: [
        {
          name: "name",
          weight: 1,
        },
        {
          name: "code",
          weight: 3,
        },
      ],
    });
  }, [courses]);

  const filteredOptions = useMemo(() => {
    if (parentRef.current) {
      parentRef.current.scrollTo({
        top: 0,
        behavior: "instant",
      });
    }
    if (debouncedSearch === "") {
      return courses;
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
        placeholder="Search course..."
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
        }}
      >
        <CommandEmpty>No course found.</CommandEmpty>
        <CommandGroup
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
          className="p-0"
        >
          {virtualOptions.map((virtualItem) => {
            const course = filteredOptions[virtualItem.index];
            return (
              <CommandItemBase
                key={course.id}
                value={course.id.toString()}
                onSelect={() => {
                  onChange(course);
                  // inputRef.current?.focus();
                }}
                style={{
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                className="py-0 absolute top-0 left-0 right-0"
                selected={value?.id === course.id}
              >
                <div className="py-1.5 px-2 w-full truncate">
                  {course.code} {course.name}
                </div>
              </CommandItemBase>
            );
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

export function SelectCourseCombobox({
  value,
  onChange,
  courses,
  // limit,
  disabled,
}: {
  value: Course | null;
  onChange: (value: Course) => void;
  courses: Course[];
  // limit: number;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const [buttonWidth, setButtonWidth] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    // Check if the ref has a current value (the DOM node)
    if (buttonRef.current) {
      // Use offsetWidth for width including borders/padding, or clientWidth for inner width
      setButtonWidth(buttonRef.current.offsetWidth);
    }
    // Resize event listener
    const callback = () => {
      if (buttonRef.current) {
        setButtonWidth(buttonRef.current.offsetWidth);
      }
    };
    window.addEventListener("resize", callback);
    return () => {
      window.removeEventListener("resize", callback);
    };
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            ref={buttonRef}
            className="flex-row w-full h-12 border border-input rounded-md flex items-center justify-between px-3 truncate"
            disabled={disabled}
          >
            <span
              className={cn("flex flex-row gap-2", {
                "text-foreground": value !== null,
                "text-muted-foreground": value === null,
              })}
            >
              {value !== null
                ? `${value.code} ${value.name}`
                : "No Course Specified"}
            </span>
            <div className="flex flex-row gap-2 items-center">
              <ChevronsUpDown className="opacity-50" />
            </div>
          </Button>
        }
      />

      <PopoverContent
        className="p-0"
        style={{
          width: buttonWidth,
        }}
      >
        <SelectCourseCommand
          value={value}
          onChange={onChange}
          courses={courses}
        />
      </PopoverContent>
    </Popover>
  );
}

export function SwapRequestModal({ courses }: { courses: Course[] }) {
  const [open, setOpen] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="default"
        size="lg"
        onClick={() => {
          setOpen(true);
        }}
      >
        <Plus className="size-4" /> New Swap
      </Button>
      <DialogContent className="p-0 bg-transparent border-none">
        <SelectCourseCommand
          value={course}
          onChange={(course) => {
            setCourse(course);
            setOpen(false);
            posthog.capture("swap-request", {
              course_code: course.code,
              source: "modal",
            });
            router.push(`/app/swap/${course.code}/edit`);
          }}
          courses={courses}
        />
      </DialogContent>
    </Dialog>
  );
}
