"use client";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { z } from "zod";
import { injectDefaults } from "../lib/zod";

const ThemeStoreStateSchema = injectDefaults(
  z.object({
    theme: z.enum(["light", "dark"]),
  }),
  {
    theme: "dark",
  }
);

type ThemeStoreState = z.infer<typeof ThemeStoreStateSchema>;

type ThemeStore = {
  setTheme: (theme: "light" | "dark") => void;
} & ThemeStoreState;

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: "dark",
      setTheme: (theme: "light" | "dark") => set({ theme }),
    }),
    { name: "theme", storage: createJSONStorage(() => localStorage) }
  )
);

export function ThemeProvider({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  const { theme } = useThemeStore(useShallow(({ theme }) => ({ theme })));

  return (
    <body
      className={cn(
        {
          dark: theme === "dark",
        },
        className
      )}
    >
      {children}
    </body>
  );
}
