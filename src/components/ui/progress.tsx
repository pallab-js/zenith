import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  className,
  tone = "primary",
}: {
  value: number;
  className?: string;
  tone?: "primary" | "green" | "magenta";
}) {
  const pct = Math.max(0, Math.min(100, value));
  const bg =
    tone === "green"
      ? "bg-green"
      : tone === "magenta"
        ? "bg-magenta"
        : "bg-primary";
  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-pill bg-ink-06",
        className,
      )}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-pill transition-[width] duration-500", bg)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function ProgressRing({
  value,
  size = 44,
  stroke = 5,
  className,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const tone = pct >= 70 ? "var(--color-green)" : "var(--color-primary)";
  return (
    <span
      className={cn("relative inline-flex items-center justify-center", className)}
      role="img"
      aria-label={label ?? `${pct}% complete`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-ink-06)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="absolute font-head text-[11px] font-bold">{pct}</span>
    </span>
  );
}
