#!/usr/bin/env python3
"""Visualize the Plant A digital-twin trial run (outputs/s6).

Design follows the data-visualization skill: insight titles, sorted+highlighted
bars, colorblind-safe palette, labeled axes, minimal chartjunk, direct labels.
Renders locally with matplotlib (no remote service required).
"""
from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

RUN = Path("outputs/s6")
OUT = Path("figures")
OUT.mkdir(exist_ok=True)

HILITE = "#0077BB"   # colorblind-safe blue (focus)
MUTED = "#C7CCD1"    # grey (context)
INK = "#1e293b"

plt.rcParams.update({
    "font.size": 12,
    "axes.titlesize": 15,
    "axes.titleweight": "bold",
    "axes.edgecolor": "#94a3b8",
    "figure.facecolor": "white",
    "axes.facecolor": "white",
})


def short(inv: str) -> str:
    return inv.replace("INV ", "")


# ---------- Figure 1: ranking + accuracy ----------
rank = pd.read_csv(RUN / "inverter_rankings.csv").sort_values("total_lost_kwh")
met = pd.read_csv(RUN / "metrics_with_module_temperature.csv")

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))

# Panel A: ranked underperformers (horizontal bar, worst highlighted)
labels = [short(i) for i in rank["inverter_id"]]
vals = rank["total_lost_kwh"].to_numpy()
colors = [MUTED] * len(vals)
colors[-1] = HILITE  # largest loss (last after ascending sort)
ax1.barh(labels, vals, color=colors, height=0.62)
for y, v in enumerate(vals):
    ax1.text(v + vals.max() * 0.01, y, f"{v/1000:.2f} MWh", va="center",
             fontsize=11, fontweight="bold", color=INK)
ax1.set_xlabel("Lost energy vs healthy twin (kWh, 2019–2020)")
ax1.set_title("INV 01.01.004 lost the most energy — 2.1 MWh")
ax1.set_xlim(0, vals.max() * 1.18)
for s in ("top", "right"):
    ax1.spines[s].set_visible(False)

# Panel B: model accuracy by year (MAE bars, R2 labelled)
yrs = met["year"].astype(int).astype(str).to_numpy()
mae = met["mae_norm"].to_numpy()
r2 = met["r2"].to_numpy()
bar_colors = [MUTED, HILITE, HILITE]  # 2018 = calibration, 2019-2020 = scored
ax2.bar(yrs, mae, color=bar_colors[: len(yrs)], width=0.6)
for x, (m, r) in enumerate(zip(mae, r2)):
    ax2.text(x, m + 0.0012, f"MAE {m:.3f}\nR² {r:.2f}", ha="center",
             fontsize=11, fontweight="bold", color=INK)
ax2.set_ylabel("Mean abs. error (normalized output)")
ax2.set_title("Frozen twin stays accurate: error flat, R² rising")
ax2.set_ylim(0, mae.max() * 1.35)
ax2.text(0, -mae.max() * 0.13, "2018 = calibration", ha="center",
         fontsize=9, color="#64748b")
for s in ("top", "right"):
    ax2.spines[s].set_visible(False)
ax2.grid(axis="y", alpha=0.25)

fig.suptitle("Plant A digital-twin trial — 6-inverter subset",
             fontsize=12, color="#64748b", y=1.00)
fig.tight_layout()
fig.savefig(OUT / "twin_summary.png", dpi=150, bbox_inches="tight")
print("saved", OUT / "twin_summary.png")

# ---------- Figure 2: monthly lost-kWh heatmap + trend ----------
m = pd.read_csv(RUN / "monthly_inverter_scores.csv")
m["ym"] = m["year"].astype(str) + "-" + m["month"].astype(int).map("{:02d}".format)
pivot = m.pivot_table(index="inverter_id", columns="ym",
                      values="lost_kwh", aggfunc="sum").fillna(0)
pivot = pivot.loc[rank.sort_values("total_lost_kwh", ascending=False)["inverter_id"]]

fig2, (axh, axt) = plt.subplots(
    2, 1, figsize=(15, 9), gridspec_kw={"height_ratios": [1, 1], "hspace": 0.38}
)

im = axh.imshow(pivot.to_numpy(), aspect="auto", cmap="Reds")
axh.set_yticks(range(len(pivot.index)))
axh.set_yticklabels([short(i) for i in pivot.index], fontsize=11)
axh.set_xticks(range(len(pivot.columns)))
axh.set_xticklabels(pivot.columns, rotation=90, fontsize=8)
axh.set_title("When and where energy was lost (monthly kWh)")
cbar = fig2.colorbar(im, ax=axh, pad=0.01)
cbar.set_label("Lost kWh / month")

# Trend: monthly lost kWh, worst inverter highlighted
worst = rank.sort_values("total_lost_kwh", ascending=False)["inverter_id"].iloc[0]
for inv in pivot.index:
    series = m[m["inverter_id"] == inv].sort_values("ym")
    is_worst = inv == worst
    axt.plot(series["ym"], series["lost_kwh"],
             color=HILITE if is_worst else MUTED,
             lw=2.6 if is_worst else 1.4,
             zorder=3 if is_worst else 1,
             label=short(inv) if is_worst else None)
axt.set_xticks(range(0, len(pivot.columns), 2))
axt.set_xticklabels(pivot.columns[::2], rotation=90, fontsize=8)
axt.set_ylabel("Lost kWh / month")
axt.set_title(f"{short(worst)} drives most monthly losses")
axt.legend(loc="upper left", frameon=False)
for s in ("top", "right"):
    axt.spines[s].set_visible(False)
axt.grid(axis="y", alpha=0.25)

fig2.savefig(OUT / "twin_anomaly_timeline.png", dpi=150, bbox_inches="tight")
print("saved", OUT / "twin_anomaly_timeline.png")
