const $ = (id) => document.getElementById(id);

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
      if (!q.openRoofingOnly) return true;
      return row.permits.some(
        (x) =>
          x.isRoofing &&
          x.status === "open" &&
          (q.minOpenDays == null || (x.openDurationDays ?? 0) >= q.minOpenDays),
      );
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

async function refresh() {
  try {
    const run = await tryFetch("/api/run");
    $("run").textContent = JSON.stringify(run, null, 2);
    $("counts").textContent = JSON.stringify(await tryFetch("/api/counts"), null, 2);
    $("ipfs").textContent = JSON.stringify(await tryFetch("/api/ipfs"), null, 2);
    return "api";
  } catch {
    await loadStatic();
    $("run").textContent = JSON.stringify(store.run, null, 2);
    $("counts").textContent = JSON.stringify({
      properties: store.properties.length,
      permits: store.permits.length,
      contractors: store.contractors.length,
      businesses: store.businesses.length,
      ipfs: store.run?.ipfs ?? [],
    }, null, 2);
    $("ipfs").textContent = JSON.stringify(store.run?.ipfs ?? [], null, 2);
    return "static";
  }
}

function renderTable(data) {
  const rows = data.results
    .map(
      (r) => `<tr>
        <td>${r.property.address}<br><small>${r.property.upi} · ${r.miles.toFixed(2)} mi</small></td>
        <td>${r.property.roofAgeYears ?? "—"} (${r.property.roofAgeBasis})</td>
        <td>${(r.permits || []).map((p) => `${p.status} ${p.openDurationDays ?? ""}d ${p.contractorName ?? ""}`).join("<br>")}</td>
        <td>${r.property.provenance.sourceId}</td>
      </tr>`,
    )
    .join("");
  $("table").innerHTML = `<p>${data.count} matches (showing ${data.results.length})</p>
    <table><thead><tr><th>Property</th><th>Roof age</th><th>Permits</th><th>Source</th></tr></thead><tbody>${rows}</tbody></table>`;
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
    openRoofingOnly: $("open").checked,
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
    const ql = question.toLowerCase();
    const data = queryLocal({
      lat,
      lng,
      radiusMiles: 5,
      minRoofAgeYears: ql.includes("15") || ql.includes("older") ? 15 : undefined,
      openRoofingOnly: ql.includes("open") && ql.includes("permit"),
      minOpenDays: ql.includes("many years") ? 365 * 3 : undefined,
    });
    $("agent").textContent = JSON.stringify(
      {
        question,
        answer: `${data.count} matching properties near West Chester (Chester County, PA).`,
        evidence: data.results.slice(0, 15).map((r) => ({
          address: r.property.address,
          upi: r.property.upi,
          miles: Number(r.miles.toFixed(2)),
          roofAgeYears: r.property.roofAgeYears,
          roofAgeBasis: r.property.roofAgeBasis,
          owner: r.property.ownerName,
          permits: r.permits,
          source: r.property.provenance,
        })),
      },
      null,
      2,
    );
  }
};

refresh();
