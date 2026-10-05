import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** Data-table chrome per `ex-data-table-cell`. */
export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="bg-surface/70">{children}</tr>
    </thead>
  );
}

export function TH({
  children,
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-4 py-3 font-head text-[12px] font-bold uppercase tracking-[0.08em] text-ink-55",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TD({
  children,
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        "border-b border-ink-06 px-4 py-3 align-middle text-ink-70",
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}

export function TR({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("transition-colors hover:bg-ink-06/60", className)}
      {...props}
    >
      {children}
    </tr>
  );
}
