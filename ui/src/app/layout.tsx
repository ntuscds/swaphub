import type { PropsWithChildren } from "react";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/core/i18n/provider";

// import "@telegram-apps/telegram-ui/dist/styles.css";
// import "normalize.css/normalize.css";
import "./global.css";
import { Providers } from "@/components/providers";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Your Application Title Goes Here",
  description: "Your application description goes here",
};

export default async function RootLayout({ children }: PropsWithChildren) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(inter.variable, "dark")}
    >
      <body>
        <I18nProvider>
          <Providers>{children}</Providers>
        </I18nProvider>
        <Toaster />
      </body>
    </html>
  );
}
