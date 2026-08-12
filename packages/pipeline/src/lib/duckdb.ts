import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

/** ponytail: JSON already on disk; DuckDB reads it. N+1 INSERTs if you need typed columns. */
export async function writeDuckDb(dbPath: string, artifactDir: string): Promise<void> {
  await mkdir(dirname(dbPath), { recursive: true });
  const duckdb = require("duckdb") as { Database: new (p: string) => { connect: () => any; close: Function } };
  const db = new duckdb.Database(dbPath);
  const conn = db.connect();
  const run = (sql: string) =>
    new Promise<void>((resolve, reject) => conn.run(sql, (err: Error | null) => (err ? reject(err) : resolve())));
  for (const name of ["properties", "permits", "contractors", "businesses"]) {
    const json = join(artifactDir, `${name}.json`).replaceAll("'", "''");
    await run(`CREATE OR REPLACE TABLE ${name} AS SELECT * FROM read_json_auto('${json}')`);
  }
  await new Promise<void>((resolve, reject) => conn.close((e: Error | null) => (e ? reject(e) : resolve())));
  await new Promise<void>((resolve, reject) => db.close((e: Error | null) => (e ? reject(e) : resolve())));
}
