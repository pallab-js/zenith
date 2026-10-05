"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
      <p className="text-eyebrow">Something broke</p>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">
        WELL, THAT
        <br />
        DIDN&apos;T GO WELL.
      </h1>
      <p className="mt-4 max-w-md text-[15px] text-ink-55">
        The page hit an unexpected error. Nothing was lost — the workspace data
        is still in memory.
      </p>
      <div className="mt-7 flex gap-3">
        <Button variant="green" onClick={reset}>
          Try again
        </Button>
        <Link href="/">
          <Button variant="ghost">Back to dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
