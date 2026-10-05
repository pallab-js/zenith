import { initials } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/repo/types";

const SIZES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};

export function Avatar({
  user,
  size = "sm",
  className,
  ring,
}: {
  user?: Pick<User, "name" | "avatarColor"> | null;
  size?: keyof typeof SIZES;
  className?: string;
  ring?: boolean;
}) {
  if (!user) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-ink-06 border border-dashed border-ink-12 text-ink-50",
          SIZES[size],
          className,
        )}
        aria-label="Unassigned"
      >
        —
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-head font-bold text-ink",
        ring && "ring-2 ring-canvas",
        SIZES[size],
        className,
      )}
      style={{ background: user.avatarColor }}
      title={user.name}
    >
      {initials(user.name)}
    </span>
  );
}
