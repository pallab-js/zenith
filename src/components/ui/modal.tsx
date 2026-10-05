"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Modal on a native `<dialog>` + `showModal()`.
 *
 * That gives us, for free and correctly: top-layer stacking, focus
 * containment (Tab never escapes), Escape to close, the rest of the page
 * marked inert for assistive tech, a backdrop, and focus restored to the
 * element that opened us. The old hand-rolled overlay did none of that.
 */
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
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      // React's autoFocus fires on mount, before the dialog exists as a
      // modal — move focus in after showModal instead.
      const preferred =
        dialog.querySelector<HTMLElement>("input, textarea, select") ??
        dialog.querySelector<HTMLElement>("button, a[href]") ??
        dialog;
      preferred.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Scroll lock — the dialog handles focus, this only handles the page.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      // Escape → `cancel`: swallow it so React (not the browser) decides.
      onCancel={(e) => {
        e.preventDefault();
        if (open) onClose();
      }}
      onClose={() => {
        // Fires when we call .close() above (open already false) or when the
        // browser closes us directly — only report a real dismissal.
        if (open) onClose();
      }}
      aria-labelledby={titleId}
      aria-modal="true"
      tabIndex={-1}
      className={cn(
        "zenith-dialog fixed inset-0 m-0 mt-auto max-h-[90vh] w-full max-w-none overflow-y-auto",
        "border border-ink-12 bg-canvas p-6 text-ink shadow-modal",
        "rounded-t-lg sm:m-auto sm:h-fit sm:w-fit sm:max-w-lg sm:rounded-lg",
        className,
      )}
    >
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 id={titleId} className="font-head text-xl font-bold tracking-tight">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm text-ink-55">{description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="-mr-1 rounded-full p-1.5 text-ink-50 transition hover:bg-ink-06 hover:text-ink"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </header>
      {children}
    </dialog>
  );
}
