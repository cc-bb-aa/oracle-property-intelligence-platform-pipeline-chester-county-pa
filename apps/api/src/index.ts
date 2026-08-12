import express from "express";
import { resolve } from "node:path";
import { loadStore, queryProperties } from "../../../packages/shared/src/store.ts";
import { runPipeline } from "../../../packages/pipeline/src/run.ts";

const app = express();
app.use(express.json({ limit: "2mb" }));
const web = resolve(process.env.ORACLE_ROOT ?? process.cwd(), "apps/web/public");
app.use(express.static(web));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "oracle-chester-pipeline", ts: new Date().toISOString() });
});

app.get("/api/run", async (_req, res) => {
  const store = await loadStore();
  res.json(store.run ?? { error: "pipeline not run yet" });
});

app.get("/api/counts", async (_req, res) => {
  const store = await loadStore();
  res.json({
    properties: store.properties.length,
    permits: store.permits.length,
    contractors: store.contractors.length,
    businesses: store.businesses.length,
    ipfs: store.run?.ipfs ?? [],
  });
});

app.get("/api/ipfs", async (_req, res) => {
  const store = await loadStore();
  res.json(store.run?.ipfs ?? []);
});

app.post("/api/query", async (req, res) => {
  const store = await loadStore();
  const lat = Number(req.body.lat ?? 39.9607);
  const lng = Number(req.body.lng ?? -75.6055);
  const radiusMiles = Number(req.body.radiusMiles ?? 5);
  const rows = queryProperties(store, {
    lat,
    lng,
    radiusMiles,
    minRoofAgeYears: req.body.minRoofAgeYears ?? undefined,
    openRoofingOnly: Boolean(req.body.openRoofingOnly),
    minOpenDays: req.body.minOpenDays ?? undefined,
    minOwnershipYears: req.body.minOwnershipYears ?? undefined,
    regionalOwnersOnly: Boolean(req.body.regionalOwnersOnly),
  });
  res.json({ count: rows.length, results: rows.slice(0, 200) });
});

app.post("/api/agent", async (req, res) => {
  const question = String(req.body.question ?? "");
  const store = await loadStore();
  const lat = Number(req.body.lat ?? 39.9607);
  const lng = Number(req.body.lng ?? -75.6055);
  const q = question.toLowerCase();
  const args = {
    lat,
    lng,
    radiusMiles: q.includes("five miles") || q.includes("5 miles") ? 5 : 5,
    minRoofAgeYears: q.includes("15") || q.includes("older") ? 15 : undefined,
    openRoofingOnly: q.includes("open") && q.includes("permit"),
    minOpenDays: q.includes("many years") ? 365 * 3 : undefined,
  };
  const rows = queryProperties(store, args);
  res.json({
    question,
    assumptions: args,
    answer: `${rows.length} matching properties near West Chester (Chester County, PA).`,
    evidence: rows.slice(0, 15).map((r) => ({
      address: r.property.address,
      upi: r.property.upi,
      miles: Number(r.miles.toFixed(2)),
      roofAgeYears: r.property.roofAgeYears,
      roofAgeBasis: r.property.roofAgeBasis,
      owner: r.property.ownerName,
      permits: r.permits.map((p) => ({
        permitId: p.permitId,
        status: p.status,
        openDurationDays: p.openDurationDays,
        contractor: p.contractorName,
        source: p.provenance.sourceId,
      })),
      source: r.property.provenance,
    })),
  });
});

/** MCP-ready JSON tools (Streamable HTTP-ish list/call). */
app.get("/mcp/tools", (_req, res) => {
  res.json({
    tools: [
      {
        name: "queryProperties",
        description: "Radius query over Chester County property intelligence.",
        inputSchema: {
          type: "object",
          properties: {
            lat: { type: "number" },
            lng: { type: "number" },
            radiusMiles: { type: "number" },
            minRoofAgeYears: { type: "number" },
            openRoofingOnly: { type: "boolean" },
          },
        },
      },
      { name: "getPipelineRun", description: "Latest pipeline run summary." },
    ],
  });
});

app.post("/mcp/call", async (req, res) => {
  const name = String(req.body.name ?? "");
  const store = await loadStore();
  if (name === "getPipelineRun") return res.json({ result: store.run });
  if (name === "queryProperties") {
    const rows = queryProperties(store, {
      lat: Number(req.body.arguments?.lat ?? 39.9607),
      lng: Number(req.body.arguments?.lng ?? -75.6055),
      radiusMiles: Number(req.body.arguments?.radiusMiles ?? 5),
      minRoofAgeYears: req.body.arguments?.minRoofAgeYears,
      openRoofingOnly: Boolean(req.body.arguments?.openRoofingOnly),
    });
    return res.json({ result: { count: rows.length, results: rows.slice(0, 100) } });
  }
  res.status(400).json({ error: `unknown tool ${name}` });
});

app.post("/api/pipeline/run", async (_req, res) => {
  try {
    const run = await runPipeline();
    res.json(run);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => {
  console.log(`oracle-chester listening on :${port}`);
});
