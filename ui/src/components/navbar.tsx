"use client";

import { LogOut, Moon, Plus, Sun, User, UserRound } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { env } from "@/lib/env";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStableQueryWithStatus } from "./use-stable-query";
import { setMockUserEmail } from "@/app/admin/actions";
import { getProfileImageUrl } from "@/lib/user";
import Link from "next/link";
import { useEffect, useState } from "react";

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  // Very irritating hydration issue fix.
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return null;
  }
  const isLightTheme = resolvedTheme === "light";

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

export function MockAccountsMenu({ mockUser }: { mockUser?: string }) {
  const mockAccounts = useStableQueryWithStatus(
    api.tasks.getAllMockAccounts,
    {}
  );
  const duplicateAccount = useMutation(api.tasks.duplicateAccount);
  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel className="font-normal">
        Mock Accounts <Badge variant="secondary">Temporary</Badge>
      </DropdownMenuLabel>
      <DropdownMenuCheckboxItem
        checked={mockUser === undefined}
        onClick={async () => {
          const formData = new FormData();
          await setMockUserEmail(formData);
          window.location.reload();
        }}
      >
        Default Account
      </DropdownMenuCheckboxItem>
      {mockAccounts.data?.map((account) => (
        <DropdownMenuCheckboxItem
          key={account.email}
          checked={account.email === mockUser}
          onClick={async () => {
            const formData = new FormData();
            formData.set("mockUserEmail", account.email);
            await setMockUserEmail(formData);
            window.location.reload();
          }}
        >
          {account.email}
        </DropdownMenuCheckboxItem>
      ))}
      <DropdownMenuItem onClick={() => duplicateAccount({})}>
        <Plus className="size-4" />
        New Mock Account
      </DropdownMenuItem>
    </DropdownMenuGroup>
  );
}

export function ProfileMenu({
  user,
  mockUser,
}: {
  user: {
    username: string | null;
    email: string;
  } | null;
  mockUser?: string;
}) {
  if (!user) {
    return <Button variant="outline">Get Started</Button>;
  }

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
            {user.username ? (
              <img
                src={getProfileImageUrl(user.username)}
                alt={user.username ?? ""}
                className="object-cover w-full h-full"
              />
            ) : (
              <UserRound className="size-6 text-muted-foreground" />
            )}
            {/* <UserRound className="size-5 text-muted-foreground" /> */}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              {user.username && (
                <span className="text-sm font-medium text-foreground">
                  {user.username}
                </span>
              )}
              <span className="text-xs text-muted-foreground break-all">
                {env.NEXT_PUBLIC_ALLOW_MOCK_USER && mockUser
                  ? mockUser
                  : user.email}
              </span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {env.NEXT_PUBLIC_ALLOW_MOCK_USER && (
          <MockAccountsMenu mockUser={mockUser} />
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={
            <Link href="/profile" className="flex flex-row items-center gap-2">
              <User className="size-4" />
              My Profile
            </Link>
          }
        ></DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            window.location.href = "/api/auth/microsoft/logout";
          }}
          variant="destructive"
        >
          <LogOut className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
