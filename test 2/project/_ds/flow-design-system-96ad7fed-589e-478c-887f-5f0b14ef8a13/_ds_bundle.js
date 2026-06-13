/* @ds-bundle: {"format":3,"namespace":"FlowDesignSystem_96ad7f","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Heatmap","sourcePath":"components/data/Heatmap.jsx"},{"name":"ProgressBar","sourcePath":"components/data/ProgressBar.jsx"},{"name":"ProgressGauge","sourcePath":"components/data/ProgressGauge.jsx"},{"name":"StatCard","sourcePath":"components/data/StatCard.jsx"},{"name":"Widget","sourcePath":"components/layout/Widget.jsx"},{"name":"SidebarItem","sourcePath":"components/navigation/SidebarItem.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"594004bd59cf","components/core/Button.jsx":"bd2fcbf445b5","components/data/Heatmap.jsx":"2646c6b018c9","components/data/ProgressBar.jsx":"277efc73a09c","components/data/ProgressGauge.jsx":"ce2a574628c9","components/data/StatCard.jsx":"6bbb1bd6c9f3","components/layout/Widget.jsx":"a90a5db8aa1d","components/navigation/SidebarItem.jsx":"de641cf197eb","components/navigation/Tabs.jsx":"ff115c21a824","ui_kits/flow-insights/App.jsx":"b2b25353e328","ui_kits/flow-insights/InsightsView.jsx":"667bb2094eff","ui_kits/flow-insights/Sidebar.jsx":"3648a3565550"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.FlowDesignSystem_96ad7f = window.FlowDesignSystem_96ad7f || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Small status / label pill. tone: purple (Pro/trial), success (mint),
 * neutral (hairline), dark, glow. Square-ish (radius-sm) like the Flow chips.
 */
function Badge({
  children,
  tone = "purple",
  style = {},
  ...rest
}) {
  const tones = {
    purple: {
      background: "var(--accent-secondary)",
      color: "var(--ink-primary)"
    },
    success: {
      background: "var(--accent-success)",
      color: "#054b1e"
    },
    neutral: {
      background: "var(--surface-soft)",
      color: "var(--ink-secondary)"
    },
    dark: {
      background: "var(--surface-dark)",
      color: "var(--on-dark)"
    },
    glow: {
      background: "var(--accent-glow)",
      color: "var(--surface-dark)"
    },
    green: {
      background: "var(--accent-primary)",
      color: "var(--on-accent)"
    }
  };
  const t = tones[tone] || tones.purple;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "5px",
      padding: "4px 9px",
      fontFamily: "var(--font-body)",
      fontWeight: "var(--weight-semibold)",
      fontSize: "var(--text-xs)",
      letterSpacing: "0.01em",
      lineHeight: 1.2,
      borderRadius: "var(--radius-sm)",
      whiteSpace: "nowrap",
      ...t,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Flow primary action button.
 * Variants: primary (dark ink), secondary (hairline outline on card),
 * accent (fathom green), ghost (transparent). Sizes: sm | md.
 */
function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  iconLeft = null,
  iconRight = null,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: {
      padding: "8px 14px",
      font: "var(--text-sm)",
      gap: "6px"
    },
    md: {
      padding: "11px 20px",
      font: "var(--text-base)",
      gap: "8px"
    }
  };
  const variants = {
    primary: {
      background: "var(--surface-dark)",
      color: "var(--on-dark)",
      border: "1px solid var(--surface-dark)"
    },
    accent: {
      background: "var(--accent-primary)",
      color: "var(--on-accent)",
      border: "1px solid var(--accent-primary)"
    },
    secondary: {
      background: "var(--surface-card)",
      color: "var(--ink-primary)",
      border: "1px solid var(--hairline)"
    },
    ghost: {
      background: "transparent",
      color: "var(--ink-secondary)",
      border: "1px solid transparent"
    }
  };
  const s = sizes[size] || sizes.md;
  const v = variants[variant] || variants.primary;
  return /*#__PURE__*/React.createElement("button", _extends({
    disabled: disabled,
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: s.gap,
      padding: s.padding,
      fontFamily: "var(--font-body)",
      fontWeight: "var(--weight-semibold)",
      fontSize: s.font,
      lineHeight: 1,
      borderRadius: "var(--radius-md)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      transition: "transform var(--dur-fast) var(--ease-out-power3), filter var(--dur-fast) ease, background var(--dur-fast) ease",
      ...v,
      ...style
    },
    onMouseDown: e => {
      if (!disabled) e.currentTarget.style.transform = "scale(0.97)";
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = "scale(1)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = "scale(1)";
      e.currentTarget.style.filter = "none";
    },
    onMouseEnter: e => {
      if (!disabled) e.currentTarget.style.filter = "brightness(1.08)";
    }
  }, rest), iconLeft && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex"
    }
  }, iconLeft), children, iconRight && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex"
    }
  }, iconRight));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/data/Heatmap.jsx
try { (() => {
/**
 * Streak heatmap — grid of small rounded squares, one column per week,
 * 7 rows (Sun..Sat). `weeks` is an array of week-columns, each an array
 * of 7 intensity levels 0..4 (0 = empty hairline, 4 = darkest green).
 * Empty days use hairline; active days ramp through the fathom-green scale.
 */
const RAMP = ["var(--hairline)", "var(--green-100)", "var(--green-200)", "var(--green-300)", "var(--green-500)"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function Heatmap({
  weeks = [],
  cell = 17,
  gap = 5,
  showDays = true,
  style = {}
}) {
  const [lit, setLit] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setLit(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "10px",
      ...style
    }
  }, showDays && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateRows: `repeat(7, ${cell}px)`,
      gap: `${gap}px`,
      paddingTop: 1
    }
  }, DAYS.map((d, i) => /*#__PURE__*/React.createElement("span", {
    key: d,
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "var(--text-xs)",
      color: "var(--ink-muted)",
      lineHeight: `${cell}px`,
      opacity: i % 2 ? 1 : 0.0
    }
  }, i % 2 ? d : ""))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: `${gap}px`,
      overflow: "hidden"
    }
  }, weeks.map((col, ci) => /*#__PURE__*/React.createElement("div", {
    key: ci,
    style: {
      display: "grid",
      gridTemplateRows: `repeat(7, ${cell}px)`,
      gap: `${gap}px`
    }
  }, col.map((lvl, ri) => /*#__PURE__*/React.createElement("span", {
    key: ri,
    title: DAYS[ri],
    style: {
      width: cell,
      height: cell,
      borderRadius: "var(--radius-sm)",
      background: RAMP[Math.max(0, Math.min(4, lvl))],
      transform: lit ? "scale(1)" : "scale(0.4)",
      opacity: lit ? 1 : 0,
      transition: `transform var(--dur-mid) var(--ease-out-power3) ${(ci * 7 + ri) * 4}ms, opacity var(--dur-mid) ease ${(ci * 7 + ri) * 4}ms`,
      cursor: lvl ? "pointer" : "default"
    },
    onMouseEnter: e => {
      if (lvl) e.currentTarget.style.transform = "scale(1.18)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = "scale(1)";
    }
  }))))));
}
Object.assign(__ds_scope, { Heatmap });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Heatmap.jsx", error: String((e && e.message) || e) }); }

// components/data/ProgressBar.jsx
try { (() => {
/**
 * Horizontal usage bar (the "Desktop usage" rows). icon + filled track + caption.
 * value 0..100. Fill is fathom green; track is hairline. When the value is
 * small, the % label sits to the right of the fill instead of inside it.
 */
function ProgressBar({
  value = 0,
  icon = null,
  caption,
  height = 30,
  style = {}
}) {
  const pct = Math.max(0, Math.min(100, value));
  const inside = pct >= 14;
  const [w, setW] = React.useState(0);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setW(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      color: "var(--ink-secondary)",
      flex: "0 0 auto",
      width: 22
    }
  }, icon), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      flex: "0 0 auto",
      width: 260,
      maxWidth: "40%",
      height,
      background: "var(--hairline)",
      borderRadius: "var(--radius-md)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      width: `${w}%`,
      background: "var(--accent-primary)",
      borderRadius: "var(--radius-md)",
      transition: "width 1s var(--ease-out-power3)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, inside && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontWeight: "var(--weight-semibold)",
      fontSize: "var(--text-sm)",
      color: "var(--on-accent)"
    }
  }, pct, "%")), !inside && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      left: 10,
      top: "50%",
      transform: "translateY(-50%)",
      fontFamily: "var(--font-body)",
      fontWeight: "var(--weight-semibold)",
      fontSize: "var(--text-sm)",
      color: "var(--accent-primary)"
    }
  }, pct, "%")), caption && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontWeight: "var(--weight-semibold)",
      fontSize: "var(--text-xs)",
      letterSpacing: "var(--tracking-caption)",
      textTransform: "uppercase",
      color: "var(--ink-muted)"
    }
  }, caption));
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/data/ProgressGauge.jsx
try { (() => {
/**
 * Half-doughnut gauge (the "Words per minute" widget).
 * value/max define the fill arc in fathom green; the track is hairline.
 * Center label/caption optional. Animates the arc on mount.
 */
function ProgressGauge({
  value = 0,
  max = 100,
  label,
  caption,
  size = 200,
  stroke = 22,
  style = {}
}) {
  const pct = Math.max(0, Math.min(1, value / max));
  const r = (size - stroke) / 2;
  const cx = size / 2,
    cy = size / 2;
  const circ = Math.PI * r; // half circle
  const [draw, setDraw] = React.useState(0);
  React.useEffect(() => {
    const start = performance.now(),
      dur = 1300;
    const ease = t => 1 - Math.pow(1 - t, 3); // power3.out
    let raf;
    const tick = now => {
      const p = Math.min(1, (now - start) / dur);
      setDraw(pct * ease(p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pct]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width: size,
      height: size / 2 + 8,
      ...style
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size / 2 + stroke / 2,
    viewBox: `0 0 ${size} ${size / 2 + stroke / 2}`,
    style: {
      overflow: "visible"
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: `M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`,
    fill: "none",
    stroke: "var(--hairline)",
    strokeWidth: stroke,
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: `M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`,
    fill: "none",
    stroke: "var(--accent-primary)",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeDasharray: circ,
    strokeDashoffset: circ * (1 - draw)
  })), (label || caption) && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 4,
      textAlign: "center"
    }
  }, caption && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "var(--text-sm)",
      color: "var(--ink-muted)"
    }
  }, caption), label && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: "var(--display-md)",
      letterSpacing: "var(--tracking-display)",
      color: "var(--ink-primary)",
      lineHeight: 1.1
    }
  }, label)));
}
Object.assign(__ds_scope, { ProgressGauge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ProgressGauge.jsx", error: String((e && e.message) || e) }); }

// components/data/StatCard.jsx
try { (() => {
/**
 * Stat card content: a big editorial serif number with an uppercase
 * caption beneath. Pair inside a <Widget>. `value` can be a string or
 * number; set `animate` to count up from 0 on mount (expo.out, 1.5s).
 */
function StatCard({
  value,
  label,
  info = false,
  size = "var(--display-xl)",
  children,
  style = {}
}) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!ref.current) return;
    const target = Number(String(value).replace(/[^0-9.]/g, ""));
    if (!isFinite(target) || target === 0) {
      ref.current.textContent = String(value);
      return;
    }
    const prefix = String(value).match(/^[^0-9]*/)[0] || "";
    const isComma = String(value).includes(",");
    const start = performance.now(),
      dur = 1500;
    const ease = t => 1 - Math.pow(2, -10 * t); // expo.out
    let raf;
    const tick = now => {
      const p = Math.min(1, (now - start) / dur);
      const n = Math.round(target * ease(p));
      ref.current.textContent = prefix + (isComma ? n.toLocaleString() : n);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: ref,
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: "var(--weight-medium)",
      letterSpacing: "var(--tracking-display)",
      fontSize: size,
      lineHeight: 1,
      color: "var(--ink-primary)"
    }
  }, value), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      marginTop: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontWeight: "var(--weight-semibold)",
      fontSize: "var(--text-xs)",
      letterSpacing: "var(--tracking-caption)",
      textTransform: "uppercase",
      color: "var(--ink-muted)"
    }
  }, label), info && /*#__PURE__*/React.createElement("svg", {
    width: "13",
    height: "13",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "var(--ink-muted)",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 16v-4M12 8h.01"
  }))), children);
}
Object.assign(__ds_scope, { StatCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatCard.jsx", error: String((e && e.message) || e) }); }

// components/layout/Widget.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Flat dashboard widget — the building block of the main area.
 * NO drop shadow. surface-soft fill, 12px radius, 24px padding.
 * Optional `title` (serif) + right-aligned `meta` (uppercase caption).
 * Use tone="card" for plain white panels, "soft" (default) for inset widgets.
 */
function Widget({
  title,
  meta,
  children,
  tone = "soft",
  padding = "var(--space-6)",
  style = {},
  ...rest
}) {
  const bg = tone === "card" ? "var(--surface-card)" : "var(--surface-soft)";
  return /*#__PURE__*/React.createElement("section", _extends({
    style: {
      background: bg,
      borderRadius: "var(--radius-lg)",
      padding,
      border: tone === "card" ? "1px solid var(--hairline)" : "none",
      ...style
    }
  }, rest), (title || meta) && /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: "16px",
      marginBottom: "var(--space-4)"
    }
  }, title && /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: "var(--weight-medium)",
      letterSpacing: "var(--tracking-display)",
      fontSize: "var(--display-lg)",
      color: "var(--ink-primary)",
      margin: 0,
      lineHeight: 1.1
    }
  }, title), meta && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontWeight: "var(--weight-semibold)",
      fontSize: "var(--text-xs)",
      letterSpacing: "var(--tracking-caption)",
      textTransform: "uppercase",
      color: "var(--ink-muted)",
      whiteSpace: "nowrap"
    }
  }, meta)), children);
}
Object.assign(__ds_scope, { Widget });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/Widget.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SidebarItem.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * One sidebar navigation row. Icon + label. Active row gets a soft
 * surface fill; hover transitions the background. Pass an `icon` node.
 */
function SidebarItem({
  icon = null,
  label,
  active = false,
  onClick = () => {},
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    onClick: onClick,
    "aria-current": active ? "page" : undefined,
    style: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      width: "100%",
      padding: "10px 12px",
      border: "none",
      cursor: "pointer",
      textAlign: "left",
      borderRadius: "var(--radius-md)",
      fontFamily: "var(--font-body)",
      fontSize: "var(--text-base)",
      fontWeight: active ? "var(--weight-semibold)" : "var(--weight-medium)",
      color: active ? "var(--ink-primary)" : "var(--ink-secondary)",
      background: active ? "var(--surface-soft)" : "transparent",
      transition: "background var(--dur-fast) ease, color var(--dur-fast) ease",
      ...style
    },
    onMouseEnter: e => {
      if (!active) e.currentTarget.style.background = "var(--surface-soft)";
    },
    onMouseLeave: e => {
      if (!active) e.currentTarget.style.background = "transparent";
    }
  }, rest), icon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      color: active ? "var(--ink-primary)" : "var(--ink-secondary)",
      flex: "0 0 auto"
    }
  }, icon), /*#__PURE__*/React.createElement("span", null, label));
}
Object.assign(__ds_scope, { SidebarItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SidebarItem.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
/**
 * Underline category tabs (e.g. Your Usage / Your Voice / Leaderboard).
 * Active tab = ink-primary text + a crisp 2px ink underline.
 * tabs: [{ id, label }]. Controlled via `active` + `onChange`.
 */
function Tabs({
  tabs = [],
  active,
  onChange = () => {},
  style = {}
}) {
  const current = active ?? (tabs[0] && tabs[0].id);
  return /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    style: {
      display: "flex",
      gap: "28px",
      borderBottom: "1px solid var(--hairline)",
      ...style
    }
  }, tabs.map(t => {
    const on = t.id === current;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      role: "tab",
      "aria-selected": on,
      onClick: () => onChange(t.id),
      style: {
        position: "relative",
        background: "none",
        border: "none",
        padding: "0 0 14px",
        cursor: "pointer",
        fontFamily: "var(--font-body)",
        fontSize: "var(--text-base)",
        fontWeight: on ? "var(--weight-semibold)" : "var(--weight-medium)",
        color: on ? "var(--ink-primary)" : "var(--ink-muted)",
        transition: "color var(--dur-fast) ease"
      }
    }, t.label, /*#__PURE__*/React.createElement("span", {
      style: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: "-1px",
        height: "2px",
        borderRadius: "2px",
        background: "var(--ink-primary)",
        transform: on ? "scaleX(1)" : "scaleX(0)",
        transformOrigin: "left",
        transition: "transform var(--dur-mid) var(--ease-out-power3)"
      }
    }));
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/flow-insights/App.jsx
try { (() => {
/* global React, ReactDOM */
const {
  Sidebar,
  InsightsView,
  LIcon
} = window;
function Topbar() {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "6px 30px 6px 18px",
      flex: "0 0 auto"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    "aria-label": "Toggle sidebar"
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "panel-left",
    size: 20,
    color: "var(--ink-secondary)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    "aria-label": "Notifications"
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "bell",
    size: 19,
    color: "var(--ink-secondary)"
  })), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    "aria-label": "Account"
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "circle-user-round",
    size: 21,
    color: "var(--ink-secondary)"
  }))));
}
function App() {
  const [active, setActive] = React.useState("Insights");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      height: "100vh",
      background: "var(--canvas)"
    }
  }, /*#__PURE__*/React.createElement(Sidebar, {
    active: active,
    onNavigate: setActive
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      padding: "0 16px 16px 0"
    }
  }, /*#__PURE__*/React.createElement(Topbar, null), /*#__PURE__*/React.createElement(InsightsView, null)));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/flow-insights/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/flow-insights/InsightsView.jsx
try { (() => {
/* global React */
const {
  Widget,
  StatCard,
  ProgressGauge,
  ProgressBar,
  Heatmap,
  Tabs,
  Button
} = window.FlowDesignSystem_96ad7f;
const USAGE_ROWS = [[91, "bot", "334 AI PROMPTS"], [8, "infinity", "27 OTHER TASKS"], [1, "message-square", "6 WORK MESSAGES"], [0, "messages-square", "1 PERSONAL MESSAGES"], [0, "mail", "0 EMAILS"], [0, "file-text", "0 DOCUMENTS"]];

// Build ~20 weeks of streak data, with recent weeks lit up.
function buildStreak() {
  const weeks = [];
  for (let w = 0; w < 20; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      if (w < 16) col.push(0);else col.push(Math.floor(Math.random() * Math.random() * 5));
    }
    weeks.push(col);
  }
  return weeks;
}
function ShareStamp() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 22,
      right: 28,
      width: 86,
      height: 86
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 100 100",
    width: "86",
    height: "86",
    style: {
      animation: "flow-spin 18s linear infinite"
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("path", {
    id: "circ",
    d: "M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0"
  })), /*#__PURE__*/React.createElement("circle", {
    cx: "50",
    cy: "50",
    r: "44",
    fill: "none",
    stroke: "var(--hairline)",
    strokeWidth: "1"
  }), /*#__PURE__*/React.createElement("text", {
    fill: "var(--accent-primary)",
    style: {
      fontFamily: "var(--font-body)",
      fontWeight: 600,
      fontSize: 9,
      letterSpacing: "2.5px"
    }
  }, /*#__PURE__*/React.createElement("textPath", {
    href: "#circ",
    startOffset: "0"
  }, "SHARE \xB7 SHARE \xB7 SHARE \xB7 "))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      display: "grid",
      placeItems: "center",
      color: "var(--accent-primary)"
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "arrow-up",
    size: 20,
    color: "var(--accent-primary)"
  })));
}
function YourUsage() {
  const streak = React.useMemo(buildStreak, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "ins-grid",
    key: "usage"
  }, /*#__PURE__*/React.createElement(Widget, {
    tone: "soft",
    className: "dashboard-widget",
    style: {
      gridColumn: "span 4"
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    value: "94",
    label: "Words per minute",
    info: true,
    size: "var(--display-xl)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(ProgressGauge, {
    value: 96,
    max: 100,
    caption: "Top",
    label: "4%",
    size: 188,
    stroke: 20
  }))), /*#__PURE__*/React.createElement(Widget, {
    tone: "soft",
    className: "dashboard-widget",
    style: {
      gridColumn: "span 4"
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    value: "942",
    label: "Fixes made by Flow",
    size: "var(--display-xl)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1px solid var(--hairline)",
      marginTop: 18,
      paddingTop: 14,
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Row, {
    label: "577 words corrected"
  }), /*#__PURE__*/React.createElement(Row, {
    label: "365 dictionary fixes"
  }))), /*#__PURE__*/React.createElement(Widget, {
    tone: "soft",
    className: "dashboard-widget",
    style: {
      gridColumn: "span 4"
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    value: "15,639",
    label: "Total words dictated",
    size: "var(--display-xl)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1px solid var(--hairline)",
      marginTop: 18,
      paddingTop: 14,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "monitor",
    size: 18,
    color: "var(--ink-secondary)"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontWeight: 600,
      fontSize: 14,
      color: "var(--ink-primary)"
    }
  }, "Desktop"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 13,
      color: "var(--ink-muted)"
    }
  }, "15,639 words"))), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm"
  }, "Download on mobile"))), /*#__PURE__*/React.createElement(Widget, {
    tone: "soft",
    className: "dashboard-widget",
    title: "Desktop usage",
    meta: "TOTAL APPS USED | 15",
    style: {
      gridColumn: "span 7"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 13,
      marginTop: 6
    }
  }, USAGE_ROWS.map(([v, ic, cap]) => /*#__PURE__*/React.createElement(ProgressBar, {
    key: cap,
    value: v,
    icon: /*#__PURE__*/React.createElement(LIcon, {
      name: ic,
      size: 19
    }),
    caption: cap
  })))), /*#__PURE__*/React.createElement(Widget, {
    tone: "soft",
    className: "dashboard-widget",
    title: "2 day streak",
    meta: "LONGEST STREAK | 8 DAYS",
    style: {
      gridColumn: "span 5"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "flex-end",
      gap: 26,
      fontFamily: "var(--font-body)",
      fontSize: 12,
      color: "var(--ink-muted)",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", null, "Feb"), /*#__PURE__*/React.createElement("span", null, "Mar"), /*#__PURE__*/React.createElement("span", null, "Apr"), /*#__PURE__*/React.createElement("span", null, "May"), /*#__PURE__*/React.createElement("span", null, "Jun")), /*#__PURE__*/React.createElement(Heatmap, {
    weeks: streak,
    cell: 15,
    gap: 4
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      marginTop: 16,
      fontFamily: "var(--font-body)",
      fontSize: 12,
      color: "var(--ink-muted)"
    }
  }, /*#__PURE__*/React.createElement("span", null, "Less"), ["var(--hairline)", "var(--green-100)", "var(--green-300)", "var(--green-500)"].map(c => /*#__PURE__*/React.createElement("span", {
    key: c,
    style: {
      width: 13,
      height: 13,
      borderRadius: 4,
      background: c
    }
  })), /*#__PURE__*/React.createElement("span", null, "More"))));
}
function Row({
  label
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 14,
      color: "var(--ink-secondary)"
    }
  }, /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--ink-primary)",
      fontWeight: 600
    }
  }, label.split(" ")[0]), " ", label.split(" ").slice(1).join(" ")), /*#__PURE__*/React.createElement(LIcon, {
    name: "info",
    size: 14,
    color: "var(--ink-muted)"
  }));
}
function Placeholder({
  title
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "ins-grid",
    key: title
  }, /*#__PURE__*/React.createElement(Widget, {
    tone: "soft",
    className: "dashboard-widget",
    style: {
      gridColumn: "span 12",
      minHeight: 280,
      display: "grid",
      placeItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      color: "var(--ink-muted)",
      fontFamily: "var(--font-body)"
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "bar-chart-3",
    size: 28,
    color: "var(--ink-muted)"
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 10
    }
  }, title, " \u2014 view coming soon in this kit."))));
}
function InsightsView() {
  const [tab, setTab] = React.useState("usage");
  const bodyRef = React.useRef(null);

  // Tab crossfade/slide + widget stagger on tab change
  React.useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.style.opacity = "0";
    el.style.transform = "translateX(10px)";
    const t = setTimeout(() => {
      el.style.transition = "opacity .4s var(--ease-out-power3), transform .4s var(--ease-out-power3)";
      el.style.opacity = "1";
      el.style.transform = "translateX(0)";
      staggerWidgets(el);
    }, 60);
    return () => clearTimeout(t);
  }, [tab]);
  return /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      minWidth: 0,
      background: "var(--surface-card)",
      borderRadius: "var(--radius-2xl)",
      border: "1px solid var(--hairline)",
      position: "relative",
      padding: "30px 38px 38px",
      overflow: "auto"
    }
  }, /*#__PURE__*/React.createElement(ShareStamp, null), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: "var(--weight-medium)",
      fontSize: "var(--display-md)",
      letterSpacing: "var(--tracking-display)",
      color: "var(--ink-primary)",
      marginBottom: 18
    }
  }, "Insights"), /*#__PURE__*/React.createElement(Tabs, {
    active: tab,
    onChange: setTab,
    tabs: [{
      id: "usage",
      label: "Your Usage"
    }, {
      id: "voice",
      label: "Your Voice"
    }, {
      id: "board",
      label: "Leaderboard"
    }],
    style: {
      marginBottom: 30
    }
  }), /*#__PURE__*/React.createElement("div", {
    ref: bodyRef
  }, tab === "usage" ? /*#__PURE__*/React.createElement(YourUsage, null) : /*#__PURE__*/React.createElement(Placeholder, {
    title: tab === "voice" ? "Your Voice" : "Leaderboard"
  })));
}
function staggerWidgets(scope) {
  const widgets = (scope || document).querySelectorAll(".dashboard-widget");
  widgets.forEach((w, i) => {
    w.style.opacity = "0";
    w.style.transform = "translateY(20px) scale(0.98)";
    setTimeout(() => {
      w.style.transition = "opacity .6s var(--ease-out-power3), transform .6s var(--ease-out-power3)";
      w.style.opacity = "1";
      w.style.transform = "translateY(0) scale(1)";
    }, 80 + i * 55);
  });
}
Object.assign(window, {
  InsightsView
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/flow-insights/InsightsView.jsx", error: String((e && e.message) || e) }); }

// ui_kits/flow-insights/Sidebar.jsx
try { (() => {
/* global React */
const {
  Badge,
  SidebarItem,
  Button
} = window.FlowDesignSystem_96ad7f;

// Lucide icon helper
function LIcon({
  name,
  size = 19,
  color
}) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current && window.lucide) {
      ref.current.innerHTML = "";
      const i = document.createElement("i");
      i.setAttribute("data-lucide", name);
      ref.current.appendChild(i);
      window.lucide.createIcons({
        attrs: {
          width: size,
          height: size,
          "stroke-width": 1.9
        }
      });
    }
  });
  return /*#__PURE__*/React.createElement("span", {
    ref: ref,
    style: {
      display: "inline-flex",
      color
    }
  });
}
const NAV = [["Home", "layout-grid"], ["Insights", "bar-chart-2"], ["Dictionary", "book-open"], ["Snippets", "scissors"], ["Style", "type"], ["Transforms", "wand-2"], ["Scratchpad", "sticky-note"]];
function Sidebar({
  active,
  onNavigate
}) {
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 256,
      flex: "0 0 256px",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      padding: "22px 16px 18px",
      background: "var(--canvas)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      padding: "0 8px 26px"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/flow-logo.svg",
    width: "26",
    height: "26",
    alt: "Flow"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: "var(--weight-semibold)",
      fontSize: 24,
      letterSpacing: "-0.02em",
      color: "var(--ink-primary)"
    }
  }, "Flow"), /*#__PURE__*/React.createElement(Badge, {
    tone: "purple",
    style: {
      marginLeft: 2
    }
  }, "Pro Trial")), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 3
    }
  }, NAV.map(([label, icon]) => /*#__PURE__*/React.createElement(SidebarItem, {
    key: label,
    label: label,
    icon: /*#__PURE__*/React.createElement(LIcon, {
      name: icon
    }),
    active: active === label,
    onClick: () => onNavigate(label)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--accent-secondary)",
      borderRadius: "var(--radius-lg)",
      padding: 18,
      margin: "0 4px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontWeight: 600,
      fontSize: 15,
      color: "var(--ink-primary)",
      marginBottom: 6
    }
  }, "Trial ends in ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--accent-primary)"
    }
  }, "5 days")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 13,
      color: "var(--ink-secondary)",
      lineHeight: 1.45,
      margin: "0 0 14px"
    }
  }, "Upgrade to Flow Pro to keep unlimited words and Pro features."), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    style: {
      width: "100%"
    }
  }, "Upgrade to Pro")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 3
    }
  }, [["Invite your team", "users"], ["Get a free month", "gift"], ["Settings", "settings"], ["Help", "circle-help"]].map(([l, i]) => /*#__PURE__*/React.createElement(SidebarItem, {
    key: l,
    label: l,
    icon: /*#__PURE__*/React.createElement(LIcon, {
      name: i
    }),
    onClick: () => {}
  }))));
}
Object.assign(window, {
  Sidebar,
  LIcon
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/flow-insights/Sidebar.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Heatmap = __ds_scope.Heatmap;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.ProgressGauge = __ds_scope.ProgressGauge;

__ds_ns.StatCard = __ds_scope.StatCard;

__ds_ns.Widget = __ds_scope.Widget;

__ds_ns.SidebarItem = __ds_scope.SidebarItem;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
