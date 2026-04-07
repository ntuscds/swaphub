"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Moon, Sun, UserRound } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import z from "zod";
import { useThemeStore } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMemo } from "react";

export function ThemeSwitcher() {
  const { theme, setTheme } = useThemeStore(
    useShallow(({ theme, setTheme }) => ({ theme, setTheme }))
  );

  const isLightTheme = theme === "light";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      className="size-8 rounded-sm"
      aria-label={
        isLightTheme ? "Switch to dark theme" : "Switch to light theme"
      }
      onClick={() => setTheme(isLightTheme ? "dark" : "light")}
    >
      {isLightTheme ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </Button>
  );
}

export function ProfileMenu({
  user,
}: {
  user: {
    name: string | null;
    email: string;
  } | null;
}) {
  if (!user) {
    return <Button variant="outline">Get Started</Button>;
  }

  const profileInitials = useMemo(() => {
    let profileInitials = user.name;
    if (!profileInitials) {
      return null;
    }
    // Only get a-zA-Z0-9 characters
    profileInitials = profileInitials?.replace(/[^a-zA-Z0-9] /g, "");
    if (profileInitials.length === 0) {
      return null;
    }
    const parts = profileInitials.split(" ");
    return parts
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }, [user.name]);

  // const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-9 rounded-full p-0 overflow-hidden ring-offset-background"
            aria-label="Account menu"
          >
            {profileInitials ? (
              <img
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profileInitials)}&size=128&backgroundColor=4f46e5%2C7c3aed%2C2563eb%2C0891b2%2C0d9488&backgroundType=gradientLinear&backgroundRotation=45&textColor=ffffff&fontSize=45`}
                alt={user.name ?? ""}
                className="size- object-cover"
              />
            ) : (
              <UserRound className="size-6 text-muted-foreground" />
            )}
            {/* <UserRound className="size-5 text-muted-foreground" /> */}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              {user.name && (
                <span className="text-sm font-medium text-foreground">
                  {user.name}
                </span>
              )}
              <span className="text-xs text-muted-foreground break-all">
                {user.email}
              </span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            window.location.href = "/api/auth/microsoft/logout";
            // router.push("/api/auth/microsoft/logout");
          }}
        >
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// export function Navbar() {
//   return (

//   );
// }
