import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Deterministic id generator — stable across the in-memory session. */
export function makeId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rand}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/* ── Date handling ──────────────────────────────────────────────
   <input type="date"> yields "YYYY-MM-DD", which `new Date()` parses as
   *UTC* midnight — i.e. the previous calendar day in any UTC-negative
   timezone. Comparing that against local midnight marked tasks due today
   as overdue all day and shifted `formatShortDate` back one day. Every
   date comparison in the app goes through these helpers instead.
   ─────────────────────────────────────────────────────────────── */

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse an ISO timestamp or a `YYYY-MM-DD` date-only string.
 *  Date-only strings resolve to *local* midnight (same calendar day for
 *  everyone); full timestamps keep their exact instant. */
export function toDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const m = DATE_ONLY.exec(iso);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Local midnight of the current day — the boundary "overdue" uses. */
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** `YYYY-MM-DD` for a date, in *local* time (safe to feed an `<input type=date>`). */
export function toDateOnly(d: Date = new Date()): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** True when the due date is strictly before today (status is the caller's job). */
export function isOverdue(iso?: string | null): boolean {
  const d = toDate(iso);
  if (!d) return false;
  return d < startOfToday();
}

export function formatShortDate(iso?: string | null): string {
  const d = toDate(iso);
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const minutes = Math.round(abs / 60000);
  const future = diff < 0;
  if (minutes < 1) return future ? "just now" : "just now";
  if (minutes < 60) return rtf.format(future ? minutes : -minutes, "minute");
  const hours = Math.round(abs / 3600000);
  if (hours < 24) return rtf.format(future ? hours : -hours, "hour");
  const days = Math.round(abs / 86400000);
  if (days < 30) return rtf.format(future ? days : -days, "day");
  const months = Math.round(abs / 2592000000);
  return rtf.format(future ? months : -months, "month");
}

export function percent(done: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
}

/** Stable past date for seed/activity data: n days before now. */
export function daysAgo(n: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, (n * 7) % 60, 0, 0);
  return d.toISOString();
}

export function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(17, 0, 0, 0);
  return d.toISOString();
}
