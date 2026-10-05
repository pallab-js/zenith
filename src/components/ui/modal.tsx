"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close dialog"
        tabIndex={-1}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-t-lg sm:rounded-lg",
          "bg-canvas border border-ink-12 p-6 shadow-modal animate-fade-up",
          "sm:max-w-lg",
          className,
        )}
      >
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-head text-xl font-bold tracking-tight">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-ink-55">{description}</p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="-mr-1 rounded-full p-1.5 text-ink-40 transition hover:bg-ink-06 hover:text-ink"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
