import { Suspense, type PropsWithChildren } from "react";
import type { Metadata, Viewport } from "next";
import { getLocale } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";

import "./global.css";
import { Providers } from "@/components/providers";
import { ProfileMenu, ThemeSwitcher } from "@/components/navbar";
import { cn } from "@/lib/utils";
import { Inter } from "next/font/google";
import Link from "next/link";
import {
  AUTH_SESSION_COOKIE,
  getAuth,
  MicrosoftSessionSchema,
} from "@/lib/microsoft-auth";
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
  metadataBase: new URL("https://app.swaphub.ntuscds.com"),
  title: "SwapHub",
  description: "Stop Wasting Time, Use SwapHub!",
  applicationName: "SwapHub",
  authors: [{ name: "SwapHub" }],
  keywords: ["Swap", "Hub", "ntu", "index swapping", "course planning"],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "SwapHub — Swap Your Indexes Instantly",
    description: "Stop Wasting Time, Use SwapHub!",
    type: "website",
    locale: "en_US",
    url: "https://swaphub.ntuscds.com",
    images: [
      {
        url: "/banner.png",
        width: 800,
        height: 600,
        alt: "SwapHub thumbnail",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@acrylic125",
    creator: "@acrylic125",
    title: "SwapHub",
    description: "Stop Wasting Time, Use SwapHub!",
    images: ["/banner.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export async function Navbar({ isLoading }: { isLoading: boolean }) {
  const auth = isLoading ? null : await getAuth();
  const cookieStore = await cookies();
  const mockUser = env.NEXT_PUBLIC_ALLOW_MOCK_USER
    ? await getMockUserEmailFromCookieStore(cookieStore, env.ENCRYPTION_KEY)
    : null;
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
            <Button variant="ghost" className="w-full">
              <a
                href={env.NEXT_PUBLIC_FEEDBACK_FORM_URL}
                target="_blank"
                className="w-full text-start px-2"
              >
                Feedback
              </a>
            </Button>
            <Button variant="ghost" className="w-full">
              <Link href="/about" className="w-full text-start px-2">
                About
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
              <a
                href={env.NEXT_PUBLIC_FEEDBACK_FORM_URL}
                target="_blank"
                className="text-sm"
              >
                Feedback
              </a>
              <Link href="/about">
                <p className="text-sm">About</p>
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
  const _cookies = await cookies();

  const session = _cookies.get(AUTH_SESSION_COOKIE);
  let user:
    | {
        id: string;
        email: string;
        name: string;
      }
    | undefined = undefined;
  if (session) {
    try {
      const sessionParsed = MicrosoftSessionSchema.parse(
        JSON.parse(session.value)
      );
      if (sessionParsed.accountSetup.type !== "not_setup") {
        user = {
          id: sessionParsed.accountSetup.id,
          email: sessionParsed.email,
          name: sessionParsed.accountSetup.username,
        };
      }
    } catch (error) {
      console.warn(error);
    }
  }

  return (
    <html lang={locale} className={cn(inter.variable)} suppressHydrationWarning>
      <body className={cn(inter.variable, "pt-(--safe-top)")}>
        <Providers user={user}>
          <div className="w-full h-full relative z-10 navbar-height">
            {/* Navbar */}
            <Suspense fallback={<Navbar isLoading={true} />}>
              <Navbar isLoading={false} />
            </Suspense>
            {children}
          </div>
          <Toaster richColors />
        </Providers>
      </body>
    </html>
  );
}
