"use client";
import { Button } from "./ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export function DynBackToButton({ defaultBackTo }: { defaultBackTo: string }) {
  const router = useRouter();
  return (
    <Button
      variant="link"
      className="w-fit px-0 text-primary-700 dark:text-primary-500 flex items-center gap-0.5"
      onClick={() => {
        const queryParams = new URLSearchParams(window.location.search);
        const backTo = queryParams.get("backTo");
        if (backTo) {
          router.push(backTo);
        } else {
          router.push(defaultBackTo);
        }
      }}
    >
      <ArrowLeft className="size-4 text-primary-700 dark:text-primary-500" />{" "}
      Back
    </Button>
  );
}

export function DynLinkWithBackTo({
  baseHref,
  label,
}: {
  baseHref: string;
  label: string;
}) {
  const [href, setHref] = useState(baseHref);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHref(`${baseHref}?backTo=${encodeURIComponent(window.location.href)}`);
  }, [baseHref]);

  return (
    <Link href={href}>
      <Button variant="outline" size="sm">
        {label}
      </Button>
    </Link>
  );
}
