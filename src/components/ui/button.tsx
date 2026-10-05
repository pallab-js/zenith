import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "green" | "white" | "ghost" | "ghostSm" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  // Blurple everyday action — button-primary
  primary:
    "bg-primary text-ink hover:bg-primary-soft active:translate-y-px shadow-float",
  // Green reserved for the single highest-intent action per view (§III)
  green:
    "bg-green text-ink-dark hover:brightness-95 active:translate-y-px font-semibold",
  white:
    "bg-ink text-ink-dark hover:bg-ink-70 active:translate-y-px font-medium",
  ghost:
    "bg-surface text-ink hover:bg-onyx border border-transparent hover:border-hairline",
  ghostSm:
    "bg-surface text-ink-70 hover:text-ink hover:bg-onyx text-[14px] font-medium",
  danger: "bg-magenta/15 text-magenta hover:bg-magenta/25 border border-magenta/30",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-4 text-sm gap-1.5",
  md: "h-11 px-5 text-[15px] gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-sm font-head font-medium",
        "transition-[background-color,transform,box-shadow] duration-150",
        "disabled:pointer-events-none disabled:opacity-40",
        "whitespace-nowrap select-none",
        SIZES[size],
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
