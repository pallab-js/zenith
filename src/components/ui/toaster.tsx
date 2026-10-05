"use client";

import { CheckCircle2, X } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

type Toast = { id: number; message: string; tone: "success" | "error" };

let toasts: Toast[] = [];
let seq = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function snapshot() {
  return toasts;
}

export const toast = {
  success(message: string) {
    push(message, "success");
  },
  error(message: string) {
    push(message, "error");
  },
};

function push(message: string, tone: Toast["tone"]) {
  const id = ++seq;
  toasts = [...toasts, { id, message, tone }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 4200);
}

export function Toaster() {
  const items = useSyncExternalStore(subscribe, snapshot, snapshot);
  if (items.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-5 right-5 z-[80] flex w-[min(380px,calc(100vw-40px))] flex-col gap-2"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex items-start gap-3 rounded-lg bg-canvas p-3",
            "border border-ink-12 shadow-modal animate-fade-up",
          )}
        >
          <CheckCircle2
            className={cn(
              "mt-0.5 h-5 w-5 shrink-0",
              t.tone === "success" ? "text-green" : "text-magenta",
            )}
            aria-hidden
          />
          <p className="flex-1 text-sm text-ink-70">{t.message}</p>
          <button
            onClick={() => {
              toasts = toasts.filter((x) => x.id !== t.id);
              emit();
            }}
            className="rounded-full p-1 text-ink-50 transition hover:bg-ink-06 hover:text-ink"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
