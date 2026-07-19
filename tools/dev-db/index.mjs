#!/usr/bin/env node
// Local PostgreSQL without Docker: boots real Postgres binaries with a
// project-local data dir on port 5433. Keep this process running while
// developing; Ctrl+C stops the database cleanly.
//
//   pnpm db:up      (DATABASE_URL=postgresql://postgres:postgres@localhost:5433/trademind)

import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dataDir = join(dirname(fileURLToPath(import.meta.url)), ".pgdata");
const firstRun = !existsSync(dataDir);

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "postgres",
  password: "postgres",
  port: 5433,
  persistent: true,
});

if (firstRun) {
  console.log("Initializing embedded PostgreSQL data dir (first run)...");
  await pg.initialise();
}

await pg.start();

if (firstRun) {
  await pg.createDatabase("trademind");
}

console.log("PostgreSQL running on postgresql://postgres:postgres@localhost:5433/trademind");
console.log("Press Ctrl+C to stop.");

const stop = async () => {
  console.log("\nStopping embedded PostgreSQL...");
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
