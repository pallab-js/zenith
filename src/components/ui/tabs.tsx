"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Tabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: { id: string; label: ReactNode; count?: number }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex gap-1 overflow-x-auto rounded-sm bg-surface/60 p-1 border border-ink-06",
        className,
      )}
    >
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={cn(
              "relative flex items-center gap-2 whitespace-nowrap rounded-xs px-4 py-2",
              "font-head text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-ink shadow-float"
                : "text-ink-55 hover:text-ink hover:bg-ink-06",
            )}
          >
            {t.label}
            {typeof t.count === "number" ? (
              <span
                className={cn(
                  "rounded-pill px-1.5 text-[11px] font-bold",
                  isActive ? "bg-ink/20" : "bg-ink-06 text-ink-55",
                )}
              >
                {t.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
