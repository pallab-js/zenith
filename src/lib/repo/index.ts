import { createInMemoryStore } from "@/lib/repo/in-memory";
import { createSqliteStore } from "@/lib/repo/sqlite";
import type { Store } from "@/lib/repo/types";

/**
 * The single write path for the whole app.
 *
 * Adapter selection is the *only* line that changes when persistence
 * changes (constitution §V):
 *   - `ZENITH_REPO=sqlite` (default) → SQLite file, created + seeded lazily
 *   - `ZENITH_REPO=memory`           → process-local seed (tests, demos)
 */
function createStore(): Store {
  return process.env.ZENITH_REPO === "memory"
    ? createInMemoryStore()
    : createSqliteStore();
}

export const store: Store = createStore();

export type * from "@/lib/repo/types";
