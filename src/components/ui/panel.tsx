import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";

/** Raised indigo panel — feature-card-dark chrome (DESIGN.md). */
export function Panel({
  className,
  children,
  ...props
}: ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "rounded-lg bg-surface border border-ink-06 p-5",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  hint,
  action,
  className,
}: {
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "mb-4 flex items-start justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="font-head text-lg font-bold tracking-tight">{title}</h2>
        {hint ? (
          <p className="mt-0.5 text-sm text-ink-55">{hint}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
