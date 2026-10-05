import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Tone = "magenta" | "primary" | "green" | "neutral" | "link";

const TONES: Record<Tone, string> = {
  magenta: "bg-magenta/18 text-magenta border-magenta/25",
  primary: "bg-primary/18 text-primary border-primary/30",
  green: "bg-green/15 text-green border-green/30",
  link: "bg-link/15 text-link border-link/30",
  neutral: "bg-ink-06 text-ink-70 border-ink-12",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border px-2 py-0.5",
        "font-head text-[12px] font-medium tracking-wide whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
