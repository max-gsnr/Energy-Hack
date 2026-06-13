/* SolarTwin — data.js
   Replaces the synthetic demo data with live data from the FastAPI backend (:8088).
   window.SOLAR is built after all endpoints resolve; the loading overlay in
   SolarTwin.html is removed once the object is ready.

   SOLAR object shape is kept 100% identical to the original so every JSX file
   (app, overview, inverters, anomalies, dispatch, emails, chatbot) works unchanged.
*/

(async function () {

  // ── shared helpers ─────────────────────────────────────────────────────────
  const fmt  = (n) => Math.round(n).toLocaleString("en-US");
  const eur  = (kwh, tariff) => Math.round(kwh * tariff);

  // severity ← API status_color
  const COLOR_SEV = { red: "critical", orange: "warning", yellow: "watch", green: "healthy", grey: "watch" };
  const SEV_ORDER  = ["critical", "warning", "watch", "healthy"];
  const SEV_LABEL  = { critical: "Critical", warning: "Warning", watch: "Watch", healthy: "Healthy" };
  const SEV_COLOR  = {
    critical: "var(--sev-critical)",
    warning:  "var(--accent-glow)",
    watch:    "var(--green-200)",
    healthy:  "var(--green-500)",
  };

  // ── employee directory (hardcoded — photos live in assets/people/) ─────────
  const P = "assets/people/";
  const EMPLOYEES = [
    { id: "raphael",  name: "Raphael May",      role: "Senior O&M Engineer",              photo: P + "raphael-may.png",      cats: ["hardware"],    blurb: "Owns inverter hardware faults — IGBT, fans, thermal." },
    { id: "sonja",    name: "Sonja Körner",     role: "Senior O&M Engineer",              photo: P + "sonja-koerner.png",    cats: ["performance"], blurb: "String & MPPT performance, soiling, clipping." },
    { id: "frederik", name: "Frederik Kliemt",  role: "Senior O&M Engineer",              photo: P + "frederik-kliemt.png",  cats: ["safety"],      blurb: "Electrical safety — arc faults, insulation, isolation." },
    { id: "felix",    name: "Felix Harder",     role: "Ingenieur Mittelspannungsplanung", photo: P + "felix-harder.png",     cats: ["mv"],          blurb: "Medium-voltage: transformers, reactive power." },
    { id: "vanessa",  name: "Vanessa Schöll",   role: "Teamleader Grid Connection Mgmt", photo: P + "vanessa-schoell.png",  cats: ["grid"],        blurb: "Grid export, curtailment, DSO coordination." },
    { id: "dimitar",  name: "Dimitar Gendov",   role: "Senior Project Engineer",          photo: P + "dimitar-gendov.png",   cats: ["capex"],       blurb: "Replace-verdict reviews & component capex." },
    { id: "malte",    name: "Malte Sombrutzki", role: "1st Level Support Lead",           photo: P + "malte-sombrutzki.png", cats: ["monitoring"],  blurb: "Comms dropouts, monitoring, first response." },
    { id: "cayen",    name: "Cayen Kröger",     role: "Projektcontrollerin",              photo: P + "cayen-kroeger.png",    cats: ["finance"],     blurb: "Financial sign-off on high-€ loss events." },
  ];
  const empById = Object.fromEntries(EMPLOYEES.map(e => [e.id, e]));

  // Map API contact names → design employee IDs (photo-backed employees)
  const NAME_TO_EMP_ID = {
    "Raphael May":          "raphael",
    "Sonja Körner":        "sonja",
    "Sonja Koerner":       "sonja",
    "Frederik Kliemt":     "frederik",
    "Felix Harder":        "felix",
    "Vanessa Schöll":      "vanessa",
    "Vanessa Schoell":     "vanessa",
    "Dimitar Gendov":      "dimitar",
    "Malte Sombrutzki":    "malte",
    "Cayen Kröger":        "cayen",
    "Cayen Kroeger":       "cayen",
    // API contacts not in photo set → nearest role match
    "Javier Larios":       "dimitar",    // Technical Asset Management
    "Matthias Steege":     "dimitar",    // Engineering lead
    "Vishal Kaushik":      "malte",      // SCADA / monitoring
    "Ahmed Abdalnabe":     "malte",
    "Mathias Behrendt":    "raphael",    // Field ops
    "Paul Christian Kossmann": "cayen",  // Asset manager
    "Gwen Schliemann":     "cayen",      // Finance
    "Nils Ahrens":         "cayen",
    "Stefan Müller":       "dimitar",
    "Christoph Koeppen":   "dimitar",
  };

  function nameToEmpId(name) {
    return NAME_TO_EMP_ID[name] || "malte"; // fallback: monitoring
  }

  // ── classification → display type, category ───────────────────────────────
  const CLASS_DISPLAY = {
    pre_existing_fault:   "Pre-existing fault",
    fast_degradation:     "Fast degradation",
    outage:               "Inverter outage",
    slow_degradation:     "Slow degradation",
    acute_fault:          "Acute fault",
    degradation:          "Performance degradation",
  };
  const CLASS_CAT = {
    pre_existing_fault: "hardware",
    fast_degradation:   "performance",
    outage:             "hardware",
    slow_degradation:   "performance",
    acute_fault:        "safety",
    degradation:        "performance",
  };
  function formatClass(c) { return CLASS_DISPLAY[c] || c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()); }
  function classToCategory(c) { return CLASS_CAT[c] || "monitoring"; }

  // API repair verdict → design verdict
  function formatVerdict(v) {
    if (!v) return "Monitor";
    if (v === "replace") return "Replace";
    if (v === "repair" || v === "investigate") return "Repair";
    return "Monitor";
  }

  // ── timeline milestone → design format ────────────────────────────────────
  // API timeline milestone kind → design type
  const KIND_TO_TYPE = {
    pre_existing: "anomaly",
    install:      "install",
    commissioned: "install",
    service:      "repair",
    repair:       "repair",
    fault:        "anomaly",
    degrade:      "degrade",
    degradation:  "degrade",
    event:        "event",
  };
  function inferTlType(kindOrText) {
    const k = (kindOrText || "").toLowerCase();
    if (KIND_TO_TYPE[k]) return KIND_TO_TYPE[k];
    // text-based fallback
    if (k.includes("pre_exist") || k.includes("anomal") || k.includes("fault") || k.includes("alert")) return "anomaly";
    if (k.includes("install") || k.includes("commission")) return "install";
    if (k.includes("service") || k.includes("repair") || k.includes("clean")) return "repair";
    if (k.includes("degrad") || k.includes("decline") || k.includes("drift")) return "degrade";
    return "event";
  }

  function mapTimeline(tl) {
    if (!tl || !tl.milestones || !tl.milestones.length) return [];
    return tl.milestones
      .filter(m => m.date)
      .map(m => ({
        year:   parseInt(m.date.slice(0, 4)),
        type:   inferTlType(m.kind || m.detail || ""),
        label:  (m.detail || m.kind || "").split(".")[0].slice(0, 60),
        detail: m.detail || m.kind || "",
      }))
      .sort((a, b) => a.year - b.year);
  }

  // ── seasonal monthly shape (Brandenberg, DE solar profile) ────────────────
  const SHAPE = [0.34, 0.55, 0.86, 1.12, 1.30, 1.36, 1.40, 1.25, 0.98, 0.66, 0.40, 0.28];
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const SHAPE_SUM = SHAPE.reduce((s, x) => s + x, 0);

  function buildMonthly(refExpectedKwh, refActualKwh) {
    // both in kWh, output in GWh
    return SHAPE.map((s, i) => {
      const expected = +((s / SHAPE_SUM) * refExpectedKwh / 1e6).toFixed(2);
      const actual   = +((s / SHAPE_SUM) * refActualKwh   / 1e6).toFixed(3);
      return { m: MONTHS[i], expected, actual };
    });
  }

  // ── email drafting (synchronous template, same pattern as original) ────────
  function draftEmail(anom, plant, toId) {
    const e = empById[toId];
    const subject = `[${plant.name}] ${anom.invId} — ${anom.type} (${anom.verdict})`;
    const body =
`Hi ${e.name.split(" ")[0]},

The SolarTwin model flagged a ${anom.severity.toUpperCase()} anomaly on inverter ${anom.invId} (group ${anom.group}) at ${plant.name}.

What the twin sees
• Type: ${anom.type}
• Root cause: ${anom.root}
• Estimated loss: ${fmt(anom.lossKwh)} kWh ≈ €${fmt(anom.lossEur)} to date
• Detected: ${anom.detected}

Recommended action
${anom.action}
Verdict: ${anom.verdict}.

Routing this to you as ${e.role}. Could you confirm a site window this week? I can attach the full health timeline for ${anom.invId} on request.

Thanks,
SolarTwin Plant Analyst`;
    return { to: e.name, toRole: e.role, toId, cc: "om-dispatch@enerparc.com", subject, body };
  }

  // ── seed demo emails from top anomalies ───────────────────────────────────
  function seedEmails(plant) {
    const picks = [
      { idx: 0, status: "sent",    ts: "2d ago" },
      { idx: 1, status: "seen",    ts: "3d ago" },
      { idx: 2, status: "pending", ts: "5h ago" },
      { idx: 3, status: "pending", ts: "just now" },
      { idx: 4, status: "sent",    ts: "1d ago" },
      { idx: 5, status: "pending", ts: "20m ago" },
    ];
    const sorted = [...plant.anomalies].sort((a, b) => b.lossEur - a.lossEur);
    return picks
      .filter(p => sorted[p.idx])
      .map((p, i) => {
        const a = sorted[p.idx];
        const d = draftEmail(a, plant, a.recommendedTo);
        return {
          id: `${plant.key}-MAIL-${i + 1}`,
          anomId: a.id, invId: a.invId, severity: a.severity,
          status: p.status, ts: p.ts, ...d,
        };
      });
  }

  // ── build Plant A from API responses ──────────────────────────────────────
  function buildPlantA(plantResp, mapItems, findingsResp, tlMap) {
    const tariff   = plantResp.tariff_eur_per_kwh || 0.1;
    const summary  = plantResp.summary  || {};
    const meta     = plantResp.metadata || {};
    const context  = plantResp.context  || {};

    // Yearly energy data (kWh → GWh)
    const yearlyRaw = (context.degradation_trend_summary || []);
    // Also try plant_summary yearly via context
    const yearlySummary = (summary.yearly || []);

    // Prefer plant_summary.yearly (has actual_kwh, expected_kwh, curtailment_kwh)
    const years = (yearlySummary.length ? yearlySummary : yearlyRaw).map(y => ({
      year:        y.year,
      expected:    +((y.expected_kwh || (y.median_factor || 1) * (summary.total_expected_kwh || 1e6) / 7) / 1e6).toFixed(2),
      actual:      +((y.actual_kwh   || (y.lost_kwh ? y.expected_kwh - y.lost_kwh : 0)) / 1e6).toFixed(2),
      curtailment: +((y.curtailment_kwh || 0) / 1e6).toFixed(2),
      gap:         +((y.lost_kwh || Math.max(0, (y.expected_kwh || 0) - (y.actual_kwh || 0))) / 1e6).toFixed(2),
    }));

    // If yearly from degradation_trend_summary, use plant_summary for totals
    const lastYear = years[years.length - 1] || { year: 2025, expected: 50, actual: 44, curtailment: 2 };

    // Monthly
    const monthly = buildMonthly(lastYear.expected * 1e6, lastYear.actual * 1e6);

    // Derive plant capacity from actual generation data (~1000 full-load hours/year)
    const avgAnnualExpectedKwh = years.length
      ? years.reduce((s, y) => s + (y.expected_kwh || y.expected * 1e6), 0) / years.length
      : 1_614_000;
    const capacityKwp = Math.round(avgAnnualExpectedKwh / 1000);
    const peakKwPerInv = Math.round(capacityKwp / Math.max(mapItems.length, 1));

    // Map inverters
    const groups = [...new Set(mapItems.map(iv => iv.inverter_group))].sort();
    const inverterId2Finding = {};
    const findings = findingsResp.findings || [];
    findings.forEach(f => { inverterId2Finding[f.inverter_id] = f; });

    const inverters = mapItems.map(iv => {
      const sev = COLOR_SEV[iv.status_color] || "watch";
      const lossKwh = iv.total_lost_kwh || 0;
      const lossEur = eur(lossKwh, tariff);
      const tl = tlMap[iv.inverter_id];

      // Build anomaly from finding (0 or 1 per inverter in this model)
      const finding = inverterId2Finding[iv.inverter_id];
      const anomalies = finding ? [{
        id:             finding.finding_id,
        invId:          iv.inverter_id,
        group:          iv.inverter_group,
        type:           formatClass(finding.classification),
        cat:            classToCategory(finding.classification),
        severity:       finding.severity,
        lossKwh:        finding.total_lost_kwh,
        lossEur:        finding.euro?.eur || eur(finding.total_lost_kwh, tariff),
        root:           finding.root_cause || finding.primary_reason || "No root-cause detail available.",
        action:         finding.recommended_action || "Review inverter performance data.",
        verdict:        formatVerdict(finding.repair?.verdict),
        detected:       new Date().toISOString().slice(0, 10),
        recommendedTo:  nameToEmpId(finding.routing?.[0]?.name),
      }] : [];

      return {
        id:          iv.inverter_id,
        group:       iv.inverter_group,
        row:         iv.row,
        col:         iv.column,
        severity:    sev,
        health:      iv.latest_factor || 0.8,
        lossKwh,
        lossEur,
          peakKw:      peakKwPerInv,
        commissioned: 2016,
        timeline:    tl ? mapTimeline(tl) : [],
        narrative:   tl?.narrative || `${iv.inverter_id} — timeline data will be available after the next model run.`,
        anomalies,
      };
    });

    // Fleet counts
    const fleet = Object.fromEntries(SEV_ORDER.map(s => [s, inverters.filter(iv => iv.severity === s).length]));

    // All anomalies flat
    const allAnoms = inverters.flatMap(iv => iv.anomalies);

    // Worst 8 by lossEur
    const worst = [...inverters]
      .sort((a, b) => b.lossEur - a.lossEur)
      .slice(0, 8)
      .map((iv, i) => ({ ...iv, rank: i + 1 }));

    // Headline from metadata
    const scoreYears = meta.score_years || [2019, 2025];
    const span = scoreYears.length >= 2
      ? `${scoreYears[0]}–${scoreYears[scoreYears.length - 1]}`
      : "multi-year";
    const headline = `${span} digital twin · ${inverters.length} string inverters · 5-min resolution`;

    const totalLossKwh = summary.total_lost_kwh || allAnoms.reduce((s, a) => s + a.lossKwh, 0);
    const totalLossEur = eur(totalLossKwh, tariff);

    const plant = {
      key:           "A",
      name:          `Enerparc Plant ${plantResp.plant_id || "A"}`,
      location:      "Brandenburg, DE",
      capacity:      `${(capacityKwp / 1000).toFixed(1)} MWp`,
      kind:          "Utility PV — string inverters",
      model:         meta.selected_model === "exogenous_only"
                       ? "Exogenous-Only Twin v1.0"
                       : (meta.selected_model || "Digital Twin v1.0"),
      r2:            meta.calibration_r2 || (1 - (meta.calibration_mae_norm || 0.04) * 10),
      trainYears:    scoreYears.length >= 2 ? span : "2019–2025",
      headline,
      count:         inverters.length,
      groups,
      cols:          Math.max(...groups.map(g => inverters.filter(iv => iv.group === g).length)),
      tariff,
      inverters,
      anomalies:     allAnoms,
      worst,
      years,
      monthly,
      fleet,
      totalLossKwh,
      totalLossEur,
      refYear:       lastYear.year,
      emails:        [],  // filled below
    };

    plant.emails = seedEmails(plant);
    return plant;
  }

  // ── synthetic Plant B (no real data yet) ──────────────────────────────────
  function buildSyntheticPlantB() {
    function mulberry32(a) {
      return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    const rng = mulberry32(73310902);
    const tariff = 0.094;
    const groups = ["N1", "N2", "N3", "N4"];
    const sevPool = [];
    [{ s: "healthy", n: 29 }, { s: "watch", n: 12 }, { s: "warning", n: 5 }, { s: "critical", n: 2 }]
      .forEach(({ s, n }) => { for (let i = 0; i < n; i++) sevPool.push(s); });
    for (let i = sevPool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [sevPool[i], sevPool[j]] = [sevPool[j], sevPool[i]];
    }

    const hbMap = { healthy: [0.86, 0.99], watch: [0.66, 0.83], warning: [0.46, 0.64], critical: [0.22, 0.44] };
    const lbMap = { healthy: [0, 2600],    watch: [3500, 14000],  warning: [16000, 42000], critical: [48000, 128000] };
    const BESS_ANOMS = [
      { t: "BESS cell imbalance",       cat: "hardware",   root: "Module 7 cell-voltage spread 84 mV.",              act: "Run extended top-balance; flag module.",          verdict: "Repair" },
      { t: "Central inverter clipping", cat: "performance", root: "DC/AC ratio drives 4.1% clipping at midday peaks.", act: "Re-tune dispatch curve.",                        verdict: "Monitor" },
      { t: "PCS efficiency fade",       cat: "hardware",   root: "Round-trip efficiency down to 86.1%.",              act: "Service power-conversion-system filters.",       verdict: "Repair" },
      { t: "SoC estimation drift",      cat: "monitoring", root: "Coulomb-counter SoC diverged 7% from OCV model.",   act: "Force OCV recalibration at next idle window.",   verdict: "Monitor" },
      { t: "Grid frequency-response lag", cat: "grid",     root: "FCR activation latency 1.4s.",                      act: "Tune droop controller.",                         verdict: "Repair" },
      { t: "HV bushing partial discharge", cat: "mv",      root: "PD activity on 33 kV bushing.",                     act: "Schedule PD survey; plan replacement.",          verdict: "Replace" },
    ];
    const routeCat = (cat, verdict, lossEur) => {
      if (lossEur > 9000 && verdict === "Replace") return "dimitar";
      if (lossEur > 14000) return "cayen";
      const map = { hardware: "raphael", performance: "sonja", safety: "frederik", mv: "felix", grid: "vanessa", monitoring: "malte", capex: "dimitar" };
      return map[cat] || "malte";
    };

    const inverters = [];
    let k = 0;
    for (let g = 0; g < groups.length; g++) {
      for (let c = 0; c < 12; c++) {
        if (k >= 48) break;
        const sev = sevPool[k];
        const id = `${groups[g]}-${String(c + 1).padStart(2, "0")}`;
        const hb = hbMap[sev], lb = lbMap[sev];
        const health   = +(hb[0] + rng() * (hb[1] - hb[0])).toFixed(3);
        const lossKwh  = Math.round(lb[0] + rng() * (lb[1] - lb[0]));
        const lossEur  = eur(lossKwh, tariff);
        const nA = sev === "healthy" ? (rng() < 0.25 ? 1 : 0) : sev === "watch" ? 1 : sev === "warning" ? 1 + Math.floor(rng() * 2) : 2 + Math.floor(rng() * 2);
        const anomalies = [];
        for (let a = 0; a < nA; a++) {
          const def  = BESS_ANOMS[Math.floor(rng() * BESS_ANOMS.length)];
          const aKwh = Math.round((lossKwh / Math.max(nA, 1)) * (0.7 + rng() * 0.6));
          const aEur = eur(aKwh, tariff);
          const aSev = a === 0 ? sev : (rng() < 0.5 ? sev : "watch");
          const det  = new Date(2024, Math.floor(rng() * 12), 1 + Math.floor(rng() * 27)).toISOString().slice(0, 10);
          anomalies.push({
            id: `${id}-A${a + 1}`, invId: id, group: groups[g], type: def.t, cat: def.cat,
            severity: aSev, lossKwh: aKwh, lossEur: aEur, root: def.root, action: def.act,
            verdict: def.verdict, detected: det, recommendedTo: routeCat(def.cat, def.verdict, aEur),
          });
        }
        inverters.push({
          id, group: groups[g], row: g, col: c, severity: sev, health, lossKwh, lossEur,
          peakKw: 1500, commissioned: 2017,
          timeline: [], narrative: `${id} is a BESS hybrid unit in group ${groups[g]}. Data from the Plant B twin run will be available once the model is deployed for Solarpark Lausitz.`,
          anomalies,
        });
        k++;
      }
    }

    const fleet      = Object.fromEntries(SEV_ORDER.map(s => [s, inverters.filter(iv => iv.severity === s).length]));
    const allAnoms   = inverters.flatMap(iv => iv.anomalies);
    const worst      = [...inverters].sort((a, b) => b.lossEur - a.lossEur).slice(0, 8).map((iv, i) => ({ ...iv, rank: i + 1 }));
    const totalLoss  = inverters.reduce((s, iv) => s + iv.lossKwh, 0);

    const years = [
      { year: 2019, expected: 40.9, actual: 39.8, curtailment: 0.6, gap: 1.1 },
      { year: 2020, expected: 40.6, actual: 39.1, curtailment: 0.8, gap: 1.5 },
      { year: 2021, expected: 40.2, actual: 38.0, curtailment: 1.0, gap: 2.2 },
      { year: 2022, expected: 39.9, actual: 38.6, curtailment: 0.9, gap: 1.3 },
      { year: 2023, expected: 39.6, actual: 37.4, curtailment: 1.5, gap: 2.2 },
      { year: 2024, expected: 39.4, actual: 36.9, curtailment: 1.9, gap: 2.5 },
      { year: 2025, expected: 39.1, actual: 36.1, curtailment: 2.2, gap: 3.0 },
    ];

    const plant = {
      key: "B", name: "Plant B — Solarpark Lausitz", location: "Sachsen, DE",
      capacity: "38.0 MWp · 20 MWh BESS", kind: "PV + BESS hybrid — central inverters",
      model: "Temporal Fusion Transformer v2.1", r2: 0.972, trainYears: "2018–2025",
      headline: "8-year twin · 48 power units + battery · 1-min resolution",
      count: 48, groups, cols: 12, tariff,
      inverters, anomalies: allAnoms, worst, years,
      monthly: buildMonthly(39.4 * 1e6, 36.9 * 1e6),
      fleet, totalLossKwh: totalLoss, totalLossEur: eur(totalLoss, tariff),
      refYear: 2024, emails: [],
    };
    plant.emails = seedEmails(plant);
    return plant;
  }

  // ── loading overlay helpers ────────────────────────────────────────────────
  function showError(msg) {
    const el = document.getElementById("st-error");
    if (el) el.textContent = msg;
  }
  function removeLoader() {
    const el = document.getElementById("st-loader");
    if (!el) return;
    el.style.transition = "opacity 0.3s ease";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 320);
  }

  // ── main fetch & assemble ──────────────────────────────────────────────────
  const API = "/api";  // same origin — FastAPI serves both frontend and API

  try {
    // Parallel fetch of the three fast endpoints for both plants
    const [plantRespA, mapItemsA, findingsRespA, plantRespB, mapItemsB, findingsRespB] = await Promise.all([
      fetch(`${API}/plant?plant=A`   ).then(r => { if (!r.ok) throw new Error(`/plant?plant=A ${r.status}`);    return r.json(); }),
      fetch(`${API}/map?plant=A`     ).then(r => { if (!r.ok) throw new Error(`/map?plant=A ${r.status}`);      return r.json(); }),
      fetch(`${API}/findings?plant=A`).then(r => { if (!r.ok) throw new Error(`/findings?plant=A ${r.status}`); return r.json(); }),
      fetch(`${API}/plant?plant=B`   ).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API}/map?plant=B`     ).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API}/findings?plant=B`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    // Fetch timelines for the 15 worst inverters only (by total_lost_kwh)
    const sorted15A = [...mapItemsA]
      .sort((a, b) => b.total_lost_kwh - a.total_lost_kwh)
      .slice(0, 15);
    const sorted15B = mapItemsB
      ? [...mapItemsB].sort((a, b) => b.total_lost_kwh - a.total_lost_kwh).slice(0, 15)
      : [];

    const [tlResultsA, tlResultsB] = await Promise.all([
      Promise.all(sorted15A.map(iv =>
        fetch(`${API}/timeline/${encodeURIComponent(iv.inverter_id)}?plant=A`)
          .then(r => r.ok ? r.json() : null).catch(() => null)
      )),
      Promise.all(sorted15B.map(iv =>
        fetch(`${API}/timeline/${encodeURIComponent(iv.inverter_id)}?plant=B`)
          .then(r => r.ok ? r.json() : null).catch(() => null)
      )),
    ]);

    const tlMapA = {};
    sorted15A.forEach((iv, i) => { if (tlResultsA[i]) tlMapA[iv.inverter_id] = tlResultsA[i]; });
    const tlMapB = {};
    sorted15B.forEach((iv, i) => { if (tlResultsB[i]) tlMapB[iv.inverter_id] = tlResultsB[i]; });

    const plantA = buildPlantA(plantRespA, mapItemsA, findingsRespA, tlMapA);
    const plantB = (plantRespB && mapItemsB && findingsRespB)
      ? buildPlantA(plantRespB, mapItemsB, findingsRespB, tlMapB)  // same builder — same schema
      : buildSyntheticPlantB();
    plantB.key = "B";
    plantB.name = plantB.name || "Enerparc Plant B";

    window.SOLAR = {
      plants: { A: plantA, B: plantB },
      employees: EMPLOYEES,
      empById,
      draftEmail,
      routeCat: (cat, verdict, lossEur) => {
        if (lossEur > 9000 && verdict === "Replace") return "dimitar";
        if (lossEur > 14000) return "cayen";
        const m = { hardware: "raphael", performance: "sonja", safety: "frederik", mv: "felix", grid: "vanessa", monitoring: "malte" };
        return m[cat] || "malte";
      },
      fmt,
      sevOrder: SEV_ORDER,
      sevColor:  SEV_COLOR,
      sevLabel:  SEV_LABEL,
    };

  } catch (err) {
    console.warn("[SolarTwin] Backend unreachable — falling back to demo data.", err);
    showError("Backend at :8088 is offline — showing demo data. Run: uvicorn backend.agents.api:app --port 8088");

    // Full synthetic fallback for Plant A so the demo still works
    window.SOLAR = buildFallbackSOLAR();
  }

  removeLoader();

  // ── full synthetic fallback (backend offline) ──────────────────────────────
  function buildFallbackSOLAR() {
    function mulberry32(a) {
      return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    const rng = mulberry32(20190411);
    const tariff = 0.086;
    const groups = ["A", "B", "C", "D", "E"];
    const sevPool = [];
    [{ s: "healthy", n: 41 }, { s: "watch", n: 14 }, { s: "warning", n: 7 }, { s: "critical", n: 3 }]
      .forEach(({ s, n }) => { for (let i = 0; i < n; i++) sevPool.push(s); });
    for (let i = sevPool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [sevPool[i], sevPool[j]] = [sevPool[j], sevPool[i]];
    }
    const hbMap = { healthy: [0.86, 0.99], watch: [0.66, 0.83], warning: [0.46, 0.64], critical: [0.22, 0.44] };
    const lbMap = { healthy: [0, 2600],    watch: [3500, 14000],  warning: [16000, 42000], critical: [48000, 128000] };
    const A_ANOMS = [
      { t: "String underperformance", cat: "performance", root: "One DC string reading 18% below twin.", act: "Dispatch field tech to IV-curve the affected string.", verdict: "Repair" },
      { t: "IGBT thermal drift",      cat: "hardware",    root: "Junction temperature trending above fleet median.", act: "Inspect heatsink; schedule module swap if drift continues.", verdict: "Repair" },
      { t: "Cooling fan failure",     cat: "hardware",    root: "Cabinet fan #3 RPM = 0; derating events triggered.", act: "Replace cooling fan assembly.", verdict: "Repair" },
      { t: "Communication dropout",   cat: "monitoring",  root: "Inverter offline from SCADA 11% of daylight hours.", act: "Check Modbus gateway; restore telemetry.", verdict: "Monitor" },
      { t: "Grid curtailment mismatch", cat: "grid",      root: "Active-power cap applied 240h beyond DSO schedule.", act: "Reconcile curtailment log with DSO.", verdict: "Monitor" },
      { t: "End-of-life capacitor bank", cat: "hardware", root: "DC-link capacitance down 22%; ripple rising.", act: "Replace inverter at next maintenance window.", verdict: "Replace" },
    ];
    const routeCatFn = (cat, verdict, lossEur) => {
      if (lossEur > 9000 && verdict === "Replace") return "dimitar";
      if (lossEur > 14000) return "cayen";
      const m = { hardware: "raphael", performance: "sonja", safety: "frederik", mv: "felix", grid: "vanessa", monitoring: "malte" };
      return m[cat] || "malte";
    };
    const inverters = [];
    let k = 0;
    for (let g = 0; g < groups.length; g++) {
      for (let c = 0; c < 13; c++) {
        if (k >= 65) break;
        const sev = sevPool[k];
        const id = `${groups[g]}-${String(c + 1).padStart(2, "0")}`;
        const hb = hbMap[sev], lb = lbMap[sev];
        const health = +(hb[0] + rng() * (hb[1] - hb[0])).toFixed(3);
        const lossKwh = Math.round(lb[0] + rng() * (lb[1] - lb[0]));
        const lossEur = eur(lossKwh, tariff);
        const nA = sev === "healthy" ? 0 : sev === "watch" ? 1 : 1 + Math.floor(rng() * 2);
        const anomalies = [];
        for (let a = 0; a < nA; a++) {
          const def = A_ANOMS[Math.floor(rng() * A_ANOMS.length)];
          const aKwh = Math.round((lossKwh / Math.max(nA, 1)) * (0.7 + rng() * 0.6));
          const aEur = eur(aKwh, tariff);
          anomalies.push({
            id: `${id}-A${a + 1}`, invId: id, group: groups[g], type: def.t, cat: def.cat,
            severity: sev, lossKwh: aKwh, lossEur: aEur, root: def.root, action: def.act,
            verdict: def.verdict, detected: "2024-06-01", recommendedTo: routeCatFn(def.cat, def.verdict, aEur),
          });
        }
        inverters.push({
          id, group: groups[g], row: g, col: c, severity: sev, health, lossKwh, lossEur,
          peakKw: 800, commissioned: 2016, timeline: [], narrative: `${id} — connect the backend to see the AI-reconstructed life story.`, anomalies,
        });
        k++;
      }
    }
    const fleet    = Object.fromEntries(SEV_ORDER.map(s => [s, inverters.filter(iv => iv.severity === s).length]));
    const allAnoms = inverters.flatMap(iv => iv.anomalies);
    const worst    = [...inverters].sort((a, b) => b.lossEur - a.lossEur).slice(0, 8).map((iv, i) => ({ ...iv, rank: i + 1 }));
    const totKwh   = inverters.reduce((s, iv) => s + iv.lossKwh, 0);
    const years    = [
      { year: 2019, expected: 53.8, actual: 52.1, curtailment: 0.9, gap: 1.7 },
      { year: 2020, expected: 53.2, actual: 50.4, curtailment: 1.1, gap: 2.8 },
      { year: 2021, expected: 52.7, actual: 49.1, curtailment: 1.4, gap: 3.6 },
      { year: 2022, expected: 52.1, actual: 50.6, curtailment: 1.0, gap: 1.5 },
      { year: 2023, expected: 51.6, actual: 47.9, curtailment: 1.8, gap: 3.7 },
      { year: 2024, expected: 51.0, actual: 46.2, curtailment: 2.3, gap: 4.8 },
      { year: 2025, expected: 50.5, actual: 44.8, curtailment: 2.6, gap: 5.7 },
    ];
    const plantA = {
      key: "A", name: "Enerparc Plant A", location: "Brandenburg, DE",
      capacity: "52.4 MWp", kind: "Utility PV — string inverters",
      model: "Gradient-Boosted Twin v3.2 (demo)", r2: 0.987, trainYears: "2016–2025",
      headline: "Demo mode — start backend for live data · 65 string inverters",
      count: 65, groups, cols: 13, tariff,
      inverters, anomalies: allAnoms, worst, years,
      monthly: buildMonthly(51.0 * 1e6, 46.2 * 1e6),
      fleet, totalLossKwh: totKwh, totalLossEur: eur(totKwh, tariff), refYear: 2024,
      emails: [],
    };
    plantA.emails = seedEmails(plantA);
    const plantB = buildSyntheticPlantB();
    return {
      plants: { A: plantA, B: plantB }, employees: EMPLOYEES, empById, draftEmail,
      routeCat: routeCatFn, fmt, sevOrder: SEV_ORDER, sevColor: SEV_COLOR, sevLabel: SEV_LABEL,
    };
  }

})();
