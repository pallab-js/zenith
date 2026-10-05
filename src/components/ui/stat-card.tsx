import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Big-number stat card — stat-card chrome (DESIGN.md):
 * Blurple fill, display-md numerals, 40px radius.
 */
export function StatCard({
  label,
  value,
  detail,
  tone = "primary",
  className,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: "primary" | "surface";
  className?: string;
}) {
  const surface =
    tone === "primary"
      ? "bg-primary text-ink"
      : "bg-surface text-ink border border-ink-06";
  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-xl p-6 min-h-[132px]",
        surface,
        className,
      )}
    >
      <p className="font-head text-[12px] font-bold uppercase tracking-[0.12em] opacity-80">
        {label}
      </p>
      <div className="mt-3">
        <p className="font-display text-[44px] font-bold leading-none tracking-tight">
          {value}
        </p>
        {detail ? (
          <p className="mt-2 text-[13px] opacity-85">{detail}</p>
        ) : null}
      </div>
    </div>
  );
}
