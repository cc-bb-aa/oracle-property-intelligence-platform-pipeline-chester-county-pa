const $ = (id) => document.getElementById(id);

/** Keep in sync with packages/shared/src/agent.ts */
function parseAgentQuestion(question, lat, lng) {
  const q = question.toLowerCase();
  const asksOpenPermit = q.includes("open") && q.includes("permit");
  const askedRoofingUcc = asksOpenPermit && q.includes("roofing");
  const asksAgedRoof =
    !asksOpenPermit && (q.includes("15") || q.includes("older")) && q.includes("roof");
  let minOpenDays;
  if (asksOpenPermit) {
    if (q.includes("many years")) minOpenDays = 365 * 3;
    else if (q.includes("five years") || q.includes("5 years")) minOpenDays = 365 * 5;
    else minOpenDays = 365;
  }
  return {
    lat,
    lng,
    radiusMiles: 5,
    minRoofAgeYears: asksAgedRoof ? 15 : undefined,
    openPermitsOnly: asksOpenPermit,
    openRoofingOnly: false,
    askedRoofingUcc,
    minOpenDays,
  };
}

function agentCaveats(askedRoofingUcc) {
  const caveats = [
    "Municipal building/roofing UCC (Evolve / West Chester SmartGov) is not in the public harvest.",
    "Open-permit results are Chester County Act 247 / EnerGov / health GIS, not municipal roofing permits.",
  ];
  if (askedRoofingUcc) {
    caveats.push(
      "isRoofing is keyword-tagged only; this harvest has no roofing-tagged rows. Showing long-open county permits instead.",
    );
  }
  return caveats;
}

function miles(lat1, lng1, lat2, lng2) {
  const r = (d) => (d * Math.PI) / 180;
  const R = 3958.7613;
  const dLat = r(lat2 - lat1);
  const dLng = r(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

async function tryFetch(url, opt) {
  const r = await fetch(url, opt);
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

const store = {
  run: null,
  properties: [],
  permits: [],
  contractors: [],
  businesses: [],
};

function queryLocal(q) {
  const byProp = new Map();
  for (const p of store.permits) {
    const arr = byProp.get(p.propertyId) ?? [];
    arr.push(p);
    byProp.set(p.propertyId, arr);
  }
  const contractors = new Map(store.contractors.map((c) => [c.contractorId, c]));
  const rows = store.properties
    .map((p) => ({
      property: p,
      miles: miles(q.lat, q.lng, p.lat, p.lng),
      permits: byProp.get(p.propertyId) ?? [],
    }))
    .filter((row) => row.miles <= q.radiusMiles)
    .filter((row) =>
      q.minRoofAgeYears == null
        ? true
        : row.property.roofAgeYears != null && row.property.roofAgeYears >= q.minRoofAgeYears,
    )
    .filter((row) => {
      if (!q.openRoofingOnly && !q.openPermitsOnly) return true;
      return row.permits.some((x) => {
        if (x.status !== "open") return false;
        if (q.openRoofingOnly && !x.isRoofing) return false;
        return q.minOpenDays == null || (x.openDurationDays ?? 0) >= q.minOpenDays;
      });
    })
    .sort((a, b) => a.miles - b.miles)
    .map((row) => ({
      ...row,
      contractors: row.permits
        .map((p) => (p.contractorId ? contractors.get(p.contractorId) : undefined))
        .filter(Boolean),
    }));
  return { count: rows.length, results: rows.slice(0, 200) };
}

async function loadStatic() {
  store.run = await tryFetch("./data/pipeline-run.json");
  store.properties = await tryFetch("./data/properties.json");
  store.permits = await tryFetch("./data/permits.json");
  store.contractors = await tryFetch("./data/contractors.json");
  store.businesses = await tryFetch("./data/businesses.json");
}

function renderCoverage(run) {
  if (!run || !$("coverage")) return;
  const rows = (run.coverage || [])
    .map(
      (c) =>
        `<tr><td>${c.dataset}</td><td>${c.county}${c.isFallback ? " (fallback)" : ""}</td><td>${c.records}</td><td>${c.limitations || c.sourceUrl || ""}</td></tr>`,
    )
    .join("");
  $("coverage").innerHTML = `<p>Primary <strong>${run.primaryCounty}</strong>. Fallbacks attempted: ${
    (run.fallbacksAttempted || []).join(", ") || "none (Montgomery / Delaware / Bucks unused)"
  }. Run ${run.runId} · ${run.startedAt} → ${run.finishedAt}</p>
    <table><thead><tr><th>Dataset</th><th>County</th><th>Records</th><th>Limitations / source</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderBySource() {
  if (!$("bySource") || !store.properties.length) return;
  const owners = store.properties.filter((p) => p.ownerName).length;
  const coords = store.properties.filter((p) => Number.isFinite(p.lat)).length;
  const bbb = store.contractors.filter((c) => c.bbbScore != null || c.bbbRating).length;
  const collected = store.properties[0]?.provenance?.collectedAt ?? "";
  $("bySource").innerHTML = `<table><thead><tr><th>Source</th><th>Records</th><th>Collected</th><th>Provenance</th></tr></thead><tbody>
    <tr><td>Properties (PASDA)</td><td>${store.properties.length}</td><td>${collected}</td><td>pasda-chester-parcels-202604</td></tr>
    <tr><td>Permits (EnerGov / Act 247)</td><td>${store.permits.length}</td><td>${store.permits[0]?.provenance?.collectedAt ?? ""}</td><td>${[...new Set(store.permits.map((p) => p.provenance.sourceId))].join(", ")}</td></tr>
    <tr><td>Ownership</td><td>${owners}</td><td>${collected}</td><td>PASDA OWN*</td></tr>
    <tr><td>Contractors (BBB where available)</td><td>${store.contractors.length} (BBB ${bbb})</td><td>${collected}</td><td>permit applicants; BBB null without a public bulk API</td></tr>
    <tr><td>Businesses</td><td>${store.businesses.length}</td><td>${collected}</td><td>commercial parcel owners (Sunbiz is FL-only)</td></tr>
    <tr><td>Coordinates</td><td>${coords}</td><td>${collected}</td><td>PASDA polygon centroids</td></tr>
  </tbody></table>`;
}

async function refresh() {
  try {
    const run = await tryFetch("/api/run");
    store.run = run;
    $("run").textContent = JSON.stringify(run, null, 2);
    $("counts").textContent = JSON.stringify(await tryFetch("/api/counts"), null, 2);
    $("ipfs").textContent = JSON.stringify(await tryFetch("/api/ipfs"), null, 2);
    if (!store.properties.length) await loadStatic();
  } catch {
    await loadStatic();
    $("run").textContent = JSON.stringify(store.run, null, 2);
    $("counts").textContent = JSON.stringify({
      properties: store.properties.length,
      permits: store.permits.length,
      contractors: store.contractors.length,
      businesses: store.businesses.length,
      ownership: store.properties.filter((p) => p.ownerName).length,
      coordinates: store.properties.filter((p) => Number.isFinite(p.lat)).length,
      ipfs: store.run?.ipfs ?? [],
    }, null, 2);
    $("ipfs").textContent = JSON.stringify(store.run?.ipfs ?? [], null, 2);
  }
  renderCoverage(store.run);
  renderBySource();
  try {
    $("mcp").textContent = JSON.stringify(await tryFetch("./mcp/tools.json"), null, 2);
  } catch {
    $("mcp").textContent = "MCP catalog unavailable";
  }
}

function renderTable(data) {
  const rows = data.results
    .map((r) => {
      const bbb = (r.contractors || [])
        .map((c) => `${c.name} BBB ${c.bbbRating ?? c.bbbScore ?? "n/a"}`)
        .join("; ");
      return `<tr>
        <td>${r.property.address}<br><small>${r.property.upi} · ${r.miles.toFixed(2)} mi · ${r.property.lat.toFixed(4)}, ${r.property.lng.toFixed(4)}</small></td>
        <td>${r.property.roofAgeYears ?? "—"} (${r.property.roofAgeBasis})</td>
        <td>${(r.permits || []).map((p) => `${p.status} ${p.openDurationDays ?? ""}d ${p.contractorName ?? ""}`).join("<br>")}</td>
        <td>${bbb || "BBB n/a"}</td>
        <td>${r.property.provenance.sourceId}</td>
      </tr>`;
    })
    .join("");
  $("table").innerHTML = `<p>${data.count} matches (showing ${data.results.length})</p>
    <table><thead><tr><th>Property / coords</th><th>Roof age</th><th>Permits</th><th>Contractor / BBB</th><th>Source</th></tr></thead><tbody>${rows}</tbody></table>`;
}

$("reload").onclick = refresh;
$("rerun").onclick = async () => {
  try {
    $("run").textContent = "running…";
    $("run").textContent = JSON.stringify(
      await tryFetch("/api/pipeline/run", { method: "POST" }),
      null,
      2,
    );
    refresh();
  } catch {
    $("run").textContent =
      "Pipeline run is local/Node only. This hosted runtime serves the last published Chester County artifacts.";
  }
};
$("query").onclick = async () => {
  const body = {
    lat: Number($("lat").value),
    lng: Number($("lng").value),
    radiusMiles: Number($("radius").value),
    minRoofAgeYears: $("aged").checked ? 15 : undefined,
    openPermitsOnly: $("open").checked,
    openRoofingOnly: $("roofing")?.checked,
    minOpenDays: $("open").checked ? 365 : undefined,
  };
  try {
    const data = await tryFetch("/api/query", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    renderTable(data);
  } catch {
    if (!store.properties.length) await loadStatic();
    renderTable(queryLocal(body));
  }
};
$("ask").onclick = async () => {
  const question = $("q").value;
  const lat = Number($("lat").value);
  const lng = Number($("lng").value);
  try {
    const data = await tryFetch("/api/agent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question, lat, lng }),
    });
    $("agent").textContent = JSON.stringify(data, null, 2);
  } catch {
    if (!store.properties.length) await loadStatic();
    const parsed = parseAgentQuestion(question, lat, lng);
    const data = queryLocal(parsed);
    $("agent").textContent = JSON.stringify(
      {
        question,
        assumptions: {
          radiusMiles: parsed.radiusMiles,
          minRoofAgeYears: parsed.minRoofAgeYears,
          openPermitsOnly: parsed.openPermitsOnly,
          openRoofingOnly: parsed.openRoofingOnly,
          minOpenDays: parsed.minOpenDays,
        },
        caveats: agentCaveats(parsed.askedRoofingUcc),
        answer: `${data.count} matching properties near West Chester (Chester County, PA).`,
        evidence: data.results.slice(0, 15).map((r) => ({
          address: r.property.address,
          upi: r.property.upi,
          miles: Number(r.miles.toFixed(2)),
          roofAgeYears: r.property.roofAgeYears,
          roofAgeBasis: r.property.roofAgeBasis,
          owner: r.property.ownerName,
          ownerIsRegional: r.property.ownerIsRegional,
          permits: r.permits.map((p) => ({
            permitId: p.permitId,
            status: p.status,
            openDurationDays: p.openDurationDays,
            contractor: p.contractorName,
            source: p.provenance.sourceId,
            permitType: p.permitType,
          })),
          source: r.property.provenance,
        })),
      },
      null,
      2,
    );
  }
};

refresh();
