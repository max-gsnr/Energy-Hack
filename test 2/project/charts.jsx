/* SolarTwin — SVG chart primitives (Flow palette, flat). Exported to window. */
const { useState: _useState, useEffect: _useEffect, useRef: _useRef } = React;

// Grouped bars: expected (twin) vs actual vs curtailment, per year.
function YearBars({ years, height = 230 }) {
  const [lit, setLit] = _useState(false);
  _useEffect(() => { const r = setTimeout(() => setLit(true), 40); return () => clearTimeout(r); }, []);
  const max = Math.max(...years.map((y) => y.expected)) * 1.08;
  const W = 720, H = height, padB = 34, padT = 10, padL = 30;
  const groupW = (W - padL) / years.length;
  const barW = Math.min(15, groupW / 4.2);
  const y2px = (v) => padT + (H - padB - padT) * (1 - v / max);
  const series = [
    { key: "expected", color: "var(--green-200)", off: -1.15 },
    { key: "actual", color: "var(--green-500)", off: 0 },
    { key: "curtailment", color: "var(--accent-glow)", off: 1.15 },
  ];
  return React.createElement("div", null,
    React.createElement("svg", { viewBox: `0 0 ${W} ${H}`, style: { width: "100%", height: "auto", overflow: "visible" } },
      [0, 0.25, 0.5, 0.75, 1].map((g, i) => {
        const v = max * g, y = y2px(v);
        return React.createElement("g", { key: i },
          React.createElement("line", { x1: padL, y1: y, x2: W, y2: y, stroke: "var(--hairline)", strokeWidth: 1 }),
          React.createElement("text", { x: padL - 6, y: y + 3, textAnchor: "end", fontSize: 9.5, fill: "var(--ink-muted)" }, Math.round(v)));
      }),
      years.map((yr, i) => {
        const cx = padL + groupW * (i + 0.5);
        return React.createElement("g", { key: yr.year },
          series.map((s) => {
            const v = yr[s.key], top = y2px(v), base = y2px(0);
            const x = cx + s.off * barW - barW / 2;
            const h = base - top;
            return React.createElement("rect", { key: s.key, x, y: base - h, width: barW, height: h, rx: 2, fill: s.color });
          }),
          React.createElement("text", { x: cx, y: H - 14, textAnchor: "middle", fontSize: 10.5, fontWeight: 600, fill: "var(--ink-secondary)" }, yr.year));
      })),
    React.createElement(ChartLegend, { items: [
      { c: "var(--green-200)", l: "Twin-expected" }, { c: "var(--green-500)", l: "Actual" }, { c: "var(--accent-glow)", l: "Curtailment" },
    ], unit: "GWh" }));
}

// Twin vs reality: two lines + shaded loss area between, monthly.
function TwinLines({ monthly, height = 230 }) {
  const [lit, setLit] = _useState(false);
  _useEffect(() => { const r = setTimeout(() => setLit(true), 60); return () => clearTimeout(r); }, []);
  const W = 720, H = height, padB = 28, padT = 12, padL = 30, padR = 8;
  const max = Math.max(...monthly.map((m) => m.expected)) * 1.12;
  const x = (i) => padL + (W - padL - padR) * (i / (monthly.length - 1));
  const y = (v) => padT + (H - padB - padT) * (1 - v / max);
  const lineFor = (key) => monthly.map((m, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(m[key]).toFixed(1)}`).join(" ");
  const area = monthly.map((m, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(m.expected).toFixed(1)}`).join(" ")
    + " " + [...monthly].reverse().map((m, i) => `L${x(monthly.length - 1 - i).toFixed(1)},${y(m.actual).toFixed(1)}`).join(" ") + " Z";
  return React.createElement("div", null,
    React.createElement("svg", { viewBox: `0 0 ${W} ${H}`, style: { width: "100%", height: "auto", overflow: "visible" } },
      [0, 0.5, 1].map((g, i) => { const v = max * g, yy = y(v); return React.createElement("g", { key: i },
        React.createElement("line", { x1: padL, y1: yy, x2: W, y2: yy, stroke: "var(--hairline)", strokeWidth: 1 }),
        React.createElement("text", { x: padL - 6, y: yy + 3, textAnchor: "end", fontSize: 9.5, fill: "var(--ink-muted)" }, v.toFixed(1))); }),
      React.createElement("path", { d: area, fill: "color-mix(in oklab, var(--accent-glow) 16%, transparent)", style: { opacity: lit ? 1 : 0, transition: "opacity .8s ease .4s" } }),
      React.createElement("path", { d: lineFor("expected"), fill: "none", stroke: "var(--green-300)", strokeWidth: 2, strokeDasharray: "5 4",
        style: { strokeDashoffset: lit ? 0 : 1400, strokeDasharray: lit ? "5 4" : "1400", transition: "stroke-dashoffset 1s var(--ease-out-power3)" } }),
      React.createElement("path", { d: lineFor("actual"), fill: "none", stroke: "var(--green-500)", strokeWidth: 2.4,
        style: { strokeDasharray: 1400, strokeDashoffset: lit ? 0 : 1400, transition: "stroke-dashoffset 1.1s var(--ease-out-power3)" } }),
      monthly.map((m, i) => React.createElement("text", { key: i, x: x(i), y: H - 10, textAnchor: "middle", fontSize: 9, fill: "var(--ink-muted)" }, m.m)),
    ),
    React.createElement(ChartLegend, { items: [
      { c: "var(--green-300)", l: "Twin-expected", dash: true }, { c: "var(--green-500)", l: "Actual generation" }, { c: "color-mix(in oklab, var(--accent-glow) 40%, white)", l: "Modelled loss" },
    ], unit: "GWh / mo" }));
}

function ChartLegend({ items, unit }) {
  return React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 16, marginTop: 14, flexWrap: "wrap" } },
    items.map((it, i) => React.createElement("span", { key: i, style: { display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--ink-secondary)" } },
      React.createElement("span", { style: { width: 16, height: it.dash ? 0 : 9, borderTop: it.dash ? "2px dashed " + it.c : "none", background: it.dash ? "none" : it.c, borderRadius: 2, display: "inline-block" } }),
      it.l)),
    unit && React.createElement("span", { style: { marginLeft: "auto", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-muted)" } }, unit));
}

// Donut for fleet status.
function FleetDonut({ fleet, total, size = 168 }) {
  const [lit, setLit] = _useState(false);
  _useEffect(() => { const r = setTimeout(() => setLit(true), 40); return () => clearTimeout(r); }, []);
  const order = SOLAR.sevOrder;
  const R = size / 2, r = R - 16, c = 2 * Math.PI * r;
  let acc = 0;
  const segs = order.map((sev) => {
    const val = fleet[sev] || 0; const frac = val / total;
    const seg = { sev, val, dash: c * frac, offset: c * acc };
    acc += frac; return seg;
  });
  return React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 22 } },
    React.createElement("svg", { width: size, height: size, viewBox: `0 0 ${size} ${size}`, style: { flex: "0 0 auto" } },
      React.createElement("circle", { cx: R, cy: R, r, fill: "none", stroke: "var(--hairline)", strokeWidth: 14 }),
      segs.map((s) => React.createElement("circle", { key: s.sev, cx: R, cy: R, r, fill: "none",
        stroke: SOLAR.sevColor[s.sev], strokeWidth: 14, strokeLinecap: "butt",
        strokeDasharray: `${lit ? s.dash : 0} ${c}`, strokeDashoffset: -s.offset,
        transform: `rotate(-90 ${R} ${R})`, style: { transition: "stroke-dasharray .9s var(--ease-out-power3)" } })),
      React.createElement("text", { x: R, y: R - 2, textAnchor: "middle", fontSize: 30, fontWeight: 600, fill: "var(--ink-primary)", style: { letterSpacing: "-0.02em" } }, total),
      React.createElement("text", { x: R, y: R + 16, textAnchor: "middle", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", fill: "var(--ink-muted)" }, "UNITS")),
    React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 9, flex: 1 } },
      order.map((sev) => React.createElement("div", { key: sev, style: { display: "flex", alignItems: "center", gap: 9, fontSize: 13 } },
        React.createElement(SevDot, { sev, size: 9 }),
        React.createElement("span", { style: { color: "var(--ink-secondary)", fontWeight: 500 } }, SOLAR.sevLabel[sev]),
        React.createElement("span", { style: { marginLeft: "auto", fontWeight: 600, color: "var(--ink-primary)" } }, fleet[sev] || 0)))));
}

Object.assign(window, { YearBars, TwinLines, FleetDonut, ChartLegend });
