"use client";
import { Button } from "./ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function DynBackToButton({ defaultBackTo }: { defaultBackTo: string }) {
  const router = useRouter();
  return (
    <Button
      variant="link"
      className="w-fit px-0 text-primary-500 flex items-center gap-0.5"
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
      <ArrowLeft className="size-4" /> Back
    </Button>
  );
}
