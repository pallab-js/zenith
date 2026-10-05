import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";

const FIELD =
  "w-full rounded-sm bg-canvas border border-ink-12 px-3.5 text-sm text-ink " +
  "placeholder:text-ink-50 transition-colors hover:border-ink-40 " +
  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 " +
  "disabled:opacity-50 disabled:pointer-events-none";

export function Label({
  children,
  htmlFor,
  hint,
}: {
  children: ReactNode;
  htmlFor?: string;
  hint?: string;
}) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <label
        htmlFor={htmlFor}
        className="font-head text-[13px] font-medium text-ink-70"
      >
        {children}
      </label>
      {hint ? <span className="text-xs text-ink-50">{hint}</span> : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(FIELD, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(FIELD, "py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(FIELD, "h-11 appearance-none pr-9", className)}
        {...props}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-50"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
      >
        <path
          d="M4 6l4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  error,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor} hint={hint}>
        {label}
      </Label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-magenta" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
