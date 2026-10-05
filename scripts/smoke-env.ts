/**
 * Test-harness environment. MUST be the first import of every test entry
 * point: `src/lib/service` and `src/lib/repo` read these at module load.
 *
 *  - `ZENITH_REPO=memory`        → the service layer runs against the
 *    process-local store, so `pnpm test` never touches your `zenith.db`.
 *  - `ZENITH_DB_PATH=<tmp file>` → the SQLite suite gets a throwaway file,
 *    deleted at the end of the run.
 */
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const sqliteFile = path.join(tmpdir(), `zenith-smoke-${process.pid}.db`);

// Forced, not `??=`: tests must never read or write the developer's real
// `zenith.db`, and each run must start from an empty file.
process.env.ZENITH_REPO = "memory";
process.env.ZENITH_DB_PATH = sqliteFile;

// Start from a clean file (WAL siblings included) and tidy up on exit.
for (const suffix of ["", "-wal", "-shm"]) {
  rmSync(`${process.env.ZENITH_DB_PATH}${suffix}`, { force: true });
}
process.on("exit", () => {
  for (const suffix of ["", "-wal", "-shm"]) {
    rmSync(`${process.env.ZENITH_DB_PATH}${suffix}`, { force: true });
  }
});

export const SQLITE_FILE = process.env.ZENITH_DB_PATH;
