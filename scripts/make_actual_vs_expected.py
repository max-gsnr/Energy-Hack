#!/usr/bin/env python3
"""Actual vs expected (twin) production curves for the worst inverter on each plant.
Monthly energy; the shaded area is modeled lost energy. The classic 'twin works' view."""
from __future__ import annotations
import json
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import pandas as pd
import numpy as np

OUT = Path("figures"); OUT.mkdir(exist_ok=True)
EXP = "#64748b"; ACT = "#0077BB"; LOSS = "#CC3311"; INK = "#1e293b"
plt.rcParams.update({"font.size": 12, "axes.titlesize": 15, "axes.titleweight": "bold",
                     "figure.facecolor": "white", "axes.facecolor": "white", "axes.edgecolor": "#94a3b8"})

PANELS = [
    ("Plant A · INV 01.07.047 (worst, pre-existing fault)",
     "frontend/public/data/inverters/INV_01_07_047.json"),
    ("Plant B · INV 04.08.089 (worst by lost energy)",
     "frontend/public/data_plant_b/inverters/INV_04_08_089.json"),
]

fig, axs = plt.subplots(2, 1, figsize=(15, 9))
for ax, (title, path) in zip(axs, PANELS):
    d = json.load(open(path))
    df = pd.DataFrame(d["daily"])
    df["date"] = pd.to_datetime(df["date"])
    df["ym"] = df["date"].dt.to_period("M").dt.to_timestamp()
    m = df.groupby("ym").agg(expected=("expected_kwh", "sum"),
                             actual=("actual_kwh", "sum")).reset_index()
    x = m["ym"]
    ax.plot(x, m["expected"]/1000, color=EXP, lw=1.8, ls="--", label="expected (healthy twin)")
    ax.plot(x, m["actual"]/1000, color=ACT, lw=2.0, label="actual output")
    ax.fill_between(x, m["actual"]/1000, m["expected"]/1000,
                    where=(m["expected"] >= m["actual"]), color=LOSS, alpha=0.25,
                    interpolate=True, label="lost energy")
    lost = (m["expected"] - m["actual"]).clip(lower=0).sum()/1000
    ax.set_title(f"{title}  —  {lost:.0f} MWh modeled loss")
    ax.set_ylabel("Monthly energy (MWh)")
    ax.legend(frameon=False, fontsize=11, loc="upper left", ncol=3)
    ax.xaxis.set_major_locator(mdates.YearLocator())
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    ax.set_ylim(bottom=0)
    for s in ("top", "right"): ax.spines[s].set_visible(False)
    ax.grid(axis="y", alpha=0.25)

fig.suptitle("Actual output vs the frozen-healthy twin  ·  shaded = lost energy",
             fontsize=13, color="#64748b", y=0.995)
fig.tight_layout()
fig.savefig(OUT/"actual_vs_expected.png", dpi=150, bbox_inches="tight")
print("saved", OUT/"actual_vs_expected.png")
