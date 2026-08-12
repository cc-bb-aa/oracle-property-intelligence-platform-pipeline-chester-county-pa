import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { Business, Contractor, Permit, Property } from "../../../schema/src/index.ts";

const require = createRequire(import.meta.url);

export async function writeDuckDb(opts: {
  path: string;
  properties: Property[];
  permits: Permit[];
  contractors: Contractor[];
  businesses: Business[];
}): Promise<void> {
  await mkdir(dirname(opts.path), { recursive: true });
  const duckdb = require("duckdb") as { Database: new (path: string) => any };
  const db = new duckdb.Database(opts.path);
  const conn = db.connect();
  const run = (sql: string) =>
    new Promise<void>((resolve, reject) => {
      conn.run(sql, (err) => (err ? reject(err) : resolve()));
    });
  const exec = (sql: string, params: unknown[]) =>
    new Promise<void>((resolve, reject) => {
      conn.run(sql, ...params, (err: Error | null) => (err ? reject(err) : resolve()));
    });

  await run(`CREATE TABLE IF NOT EXISTS properties (
    property_id VARCHAR PRIMARY KEY,
    upi VARCHAR,
    address VARCHAR,
    zip VARCHAR,
    owner_name VARCHAR,
    owner_mailing VARCHAR,
    lat DOUBLE,
    lng DOUBLE,
    year_built INTEGER,
    roof_age_years INTEGER,
    roof_age_basis VARCHAR,
    deed_recorded_at VARCHAR,
    ownership_years DOUBLE,
    owner_is_regional BOOLEAN,
    luc VARCHAR,
    property_class VARCHAR,
    source_id VARCHAR,
    county VARCHAR
  )`);
  await run(`CREATE TABLE IF NOT EXISTS permits (
    permit_id VARCHAR PRIMARY KEY,
    property_id VARCHAR,
    permit_type VARCHAR,
    is_roofing BOOLEAN,
    status VARCHAR,
    opened_at VARCHAR,
    closed_at VARCHAR,
    open_duration_days INTEGER,
    contractor_name VARCHAR,
    contractor_id VARCHAR,
    source_id VARCHAR
  )`);
  await run(`CREATE TABLE IF NOT EXISTS contractors (
    contractor_id VARCHAR PRIMARY KEY,
    name VARCHAR,
    bbb_score DOUBLE,
    bbb_rating VARCHAR
  )`);
  await run(`CREATE TABLE IF NOT EXISTS businesses (
    business_id VARCHAR PRIMARY KEY,
    name VARCHAR,
    address VARCHAR,
    zip VARCHAR,
    source VARCHAR
  )`);

  await run("DELETE FROM properties");
  await run("DELETE FROM permits");
  await run("DELETE FROM contractors");
  await run("DELETE FROM businesses");

  for (const p of opts.properties) {
    await exec(
      `INSERT INTO properties VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        p.propertyId,
        p.upi,
        p.address,
        p.zip ?? null,
        p.ownerName ?? null,
        p.ownerMailing ?? null,
        p.lat,
        p.lng,
        p.yearBuilt,
        p.roofAgeYears,
        p.roofAgeBasis,
        p.deedRecordedAt,
        p.ownershipYears,
        p.ownerIsRegional,
        p.luc ?? null,
        p.propertyClass ?? null,
        p.provenance.sourceId,
        p.provenance.county,
      ],
    );
  }
  for (const p of opts.permits) {
    await exec(`INSERT INTO permits VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [
      p.permitId,
      p.propertyId,
      p.permitType,
      p.isRoofing,
      p.status,
      p.openedAt,
      p.closedAt,
      p.openDurationDays,
      p.contractorName,
      p.contractorId,
      p.provenance.sourceId,
    ]);
  }
  for (const c of opts.contractors) {
    await exec(`INSERT INTO contractors VALUES (?,?,?,?)`, [
      c.contractorId,
      c.name,
      c.bbbScore,
      c.bbbRating,
    ]);
  }
  for (const b of opts.businesses) {
    await exec(`INSERT INTO businesses VALUES (?,?,?,?,?)`, [
      b.businessId,
      b.name,
      b.address ?? null,
      b.zip ?? null,
      b.source,
    ]);
  }

  await new Promise<void>((resolve, reject) => {
    conn.close((err) => (err ? reject(err) : resolve()));
  });
  await new Promise<void>((resolve, reject) => {
    db.close((err) => (err ? reject(err) : resolve()));
  });
}
