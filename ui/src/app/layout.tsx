import { Suspense, type PropsWithChildren } from "react";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";

// import "@telegram-apps/telegram-ui/dist/styles.css";
// import "normalize.css/normalize.css";
import "./global.css";
import { Providers } from "@/components/providers";
import { ProfileMenu, ThemeSwitcher } from "@/components/navbar";
import { cn } from "@/lib/utils";
import { Inter } from "next/font/google";
import Link from "next/link";
import { getAuth } from "@/lib/microsoft-auth";
import { getMockUserEmailFromCookieStore } from "@/lib/mock-user";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Swap Hub",
  description: "Swap indexes without the chaos",
};

export async function Navbar({ isLoading }: { isLoading: boolean }) {
  const auth = isLoading ? null : await getAuth();
  const cookieStore = await cookies();
  const mockUser = await getMockUserEmailFromCookieStore(
    cookieStore,
    env.ENCRYPTION_KEY
  );
  return (
    <>
      <Sheet>
        <SheetTrigger
          render={
            <Button
              variant="outline"
              className="lg:hidden size-8 fixed top-4 right-4 z-10 bg-background border-border aspect-square"
            >
              <Menu className="size-4" />
            </Button>
          }
        />

        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              <Link href="/swap">
                <h2 className="font-bold">SWAPHUB</h2>
              </Link>
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col">
            <Button variant="ghost" className="w-full">
              <Link href="/swap" className="w-full text-start px-2">
                My Swaps
              </Link>
            </Button>
            <Button variant="ghost" className="w-full">
              <Link href="/help" className="w-full text-start px-2">
                Help
              </Link>
            </Button>
          </div>
          <SheetFooter>
            <div className="flex flex-row items-center gap-3">
              <ThemeSwitcher />
              <ProfileMenu
                user={
                  auth && auth.accountSetup.type === "complete"
                    ? {
                        username: auth.accountSetup.username,
                        email: auth.email,
                      }
                    : null
                }
                mockUser={mockUser ?? undefined}
              />
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <div className="hidden lg:flex navbar-height bg-background border-b border-border flex-col items-center justify-center">
        <div className="w-full max-w-ui px-4 flex flex-row items-center justify-between">
          <div className="flex flex-row items-center gap-4">
            <Link href="/swap">
              <h2 className="font-bold">SWAPHUB</h2>
            </Link>
            <div className="flex flex-row items-center gap-2.5">
              <Link href="/swap">
                <p className="text-sm">My Swaps</p>
              </Link>
              <Link href="/help">
                <p className="text-sm">Help</p>
              </Link>
            </div>
          </div>
          <div className="flex flex-row items-center gap-3">
            <ThemeSwitcher />
            <ProfileMenu
              user={
                auth && auth.accountSetup.type === "complete"
                  ? {
                      username: auth.accountSetup.username,
                      email: auth.email,
                    }
                  : null
              }
              mockUser={mockUser ?? undefined}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default async function RootLayout({ children }: PropsWithChildren) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning className={cn(inter.variable)}>
      <Providers fontClass={inter.variable}>
        <div className="w-full h-full relative z-10 navbar-height">
          {/* Navbar */}
          <Suspense fallback={<Navbar isLoading={true} />}>
            <Navbar isLoading={false} />
          </Suspense>
          {children}
        </div>
        <Toaster />
      </Providers>
    </html>
  );
}
