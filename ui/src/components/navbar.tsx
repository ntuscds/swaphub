"use client";

import { LogOut, Moon, Plus, Sun, UserRound } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useThemeStore } from "@/components/theme-provider";
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
import { useMemo } from "react";
import { Badge } from "./ui/badge";
import { env } from "@/lib/env";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStableQueryWithStatus } from "./use-stable-query";
import { setMockUserEmail } from "@/app/admin/actions";

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
    name: string | null;
    email: string;
  } | null;
  mockUser?: string;
}) {
  const profileInitials = useMemo(() => {
    if (!user) {
      return null;
    }
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
  }, [user?.name]);

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
      <DropdownMenuContent align="end" className="min-w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              {user.name && (
                <span className="text-sm font-medium text-foreground">
                  {user.name}
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
        {/* <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            Mock Accounts
            <Badge variant="secondary">Temporary</Badge>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Email</DropdownMenuItem>
              <DropdownMenuItem>Message</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>More...</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub> */}

        <DropdownMenuSeparator />
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

// export function Navbar() {
//   return (

//   );
// }
