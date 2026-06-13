#!/usr/bin/env python3
"""Pitch figures for Plant A and Plant B, from the real exported runs.
Design follows the data-viz skill: insight titles, sorted/highlighted bars,
colorblind-safe palette, labeled axes, minimal chartjunk."""
from __future__ import annotations
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

OUT = Path("figures"); OUT.mkdir(exist_ok=True)
LOSS = "#CC3311"; CURT = "#0077BB"; FACTOR = "#009988"; HILITE = "#EE7733"; MUTED = "#BBBBBB"; INK = "#1e293b"
plt.rcParams.update({"font.size": 12, "axes.titlesize": 14, "axes.titleweight": "bold",
                     "figure.facecolor": "white", "axes.facecolor": "white", "axes.edgecolor": "#94a3b8"})

def style(ax):
    for s in ("top", "right"): ax.spines[s].set_visible(False)
    ax.grid(axis="y", alpha=0.25)

# ---------------- PLANT A ----------------
A_years = [2019,2020,2021,2022,2023,2024,2025]
A_loss  = [78322,80110,125232,147085,149644,167461,252006]
A_curt  = [0,0,403,16662,17850,32460,24500]
A_fyear = [2017,2018,2019,2020,2021,2022,2023,2024,2025]
A_fac   = [1.002,0.988,0.991,0.997,0.978,0.968,0.950,0.946,0.920]
A_worst_id  = ["07.047","08.058","07.045","09.062","07.051","02.012"]
A_worst_val = [51371,31894,31240,29660,28315,26764]
A_worst_pe  = [True,False,False,False,True,False]

fig, axs = plt.subplots(1, 3, figsize=(18, 5.4))
# A1 — yearly loss vs curtailment
x = np.arange(len(A_years)); w = 0.4
axs[0].bar(x-w/2, np.array(A_loss)/1000, w, color=LOSS, label="performance loss")
axs[0].bar(x+w/2, np.array(A_curt)/1000, w, color=CURT, label="curtailment")
axs[0].set_xticks(x); axs[0].set_xticklabels(A_years)
axs[0].set_ylabel("Energy gap (MWh)")
axs[0].set_title("Plant A: performance loss dominates and is rising")
axs[0].legend(frameon=False, fontsize=11)
for i,v in enumerate(A_loss): axs[0].text(i-w/2, v/1000+3, f"{v/1000:.0f}", ha="center", fontsize=9, color=INK)
style(axs[0])
# A2 — degradation factor
axs[1].axhline(1.0, color=MUTED, lw=1, ls="--")
axs[1].plot(A_fyear, A_fac, color=FACTOR, lw=2.6, marker="o", ms=6)
axs[1].annotate("healthy = 1.00", (A_fyear[0], 1.0), textcoords="offset points", xytext=(4,6), fontsize=10, color=MUTED)
axs[1].annotate(f"{A_fac[-1]:.2f}", (A_fyear[-1], A_fac[-1]), textcoords="offset points", xytext=(-6,-16), fontsize=12, fontweight="bold", color=FACTOR)
axs[1].set_ylabel("Health factor (output vs healthy 2017)")
axs[1].set_title("Twin tracks ~8% performance decline by 2025")
axs[1].set_ylim(0.86, 1.03); style(axs[1])
# A3 — worst inverters
order = np.argsort(A_worst_val)
ids = [A_worst_id[i] for i in order]; vals = [A_worst_val[i] for i in order]; pe = [A_worst_pe[i] for i in order]
colors = [HILITE if p else MUTED for p in pe]
axs[2].barh(range(len(ids)), np.array(vals)/1000, color=colors, height=0.62)
axs[2].set_yticks(range(len(ids))); axs[2].set_yticklabels([f"INV {i}"+("  PE" if p else "") for i,p in zip(ids,pe)], fontsize=11)
for i,v in enumerate(vals): axs[2].text(v/1000+0.4, i, f"{v/1000:.1f}", va="center", fontsize=10, fontweight="bold", color=INK)
axs[2].set_xlabel("Lost energy 2019-2025 (MWh)")
axs[2].set_title("Worst inverters  (PE = pre-existing fault)")
axs[2].set_xlim(0, max(vals)/1000*1.18); style(axs[2])
fig.suptitle("PLANT A  ·  65 inverters  ·  frozen healthy-2017 twin", fontsize=12, color="#64748b", y=1.02)
fig.tight_layout()
fig.savefig(OUT/"plant_a_charts.png", dpi=150, bbox_inches="tight")
print("saved", OUT/"plant_a_charts.png")

# ---------------- PLANT B ----------------
B_fyear = [2018,2019,2020,2021,2022,2023,2024,2025,2026]
B_fac   = [1.004,1.006,0.991,0.974,0.957,0.952,0.944,0.954,0.976]
B_years = [2020,2021,2022,2023,2024,2025]
B_loss  = [631064,491694,454626,565880,267209,533798]
B_curt  = [7091,321803,290711,247724,176540,852032]
B_reliable = 7  # index up to 2024 (2018..2024) reliable

fig2, axs2 = plt.subplots(1, 2, figsize=(13.5, 5.4))
# B1 — degradation trend (the headline), 2025+ flagged unreliable
solid_x, solid_y = B_fyear[:B_reliable], B_fac[:B_reliable]
dash_x, dash_y = B_fyear[B_reliable-1:], B_fac[B_reliable-1:]
axs2[0].axhline(1.0, color=MUTED, lw=1, ls="--")
axs2[0].plot(solid_x, solid_y, color=FACTOR, lw=2.8, marker="o", ms=7, label="2018-2024 (reliable)")
axs2[0].plot(dash_x, dash_y, color=MUTED, lw=2, ls=":", marker="o", ms=6, label="2025+ (data unreliable)")
axs2[0].annotate("~1%/yr decline", (2021, 0.974), textcoords="offset points", xytext=(6,10), fontsize=11, color=FACTOR, fontweight="bold")
axs2[0].annotate(f"{B_fac[6]:.2f}", (2024, B_fac[6]), textcoords="offset points", xytext=(-4,-18), fontsize=12, fontweight="bold", color=FACTOR)
axs2[0].set_ylabel("Health factor (output vs healthy 2018)")
axs2[0].set_title("Plant B: a clean ~1%/yr degradation curve")
axs2[0].set_ylim(0.92, 1.02); axs2[0].legend(frameon=False, fontsize=10, loc="lower left"); style(axs2[0])
# B2 — yearly loss vs curtailment
x = np.arange(len(B_years)); w = 0.4
axs2[1].bar(x-w/2, np.array(B_loss)/1000, w, color=LOSS, label="performance loss")
axs2[1].bar(x+w/2, np.array(B_curt)/1000, w, color=CURT, label="curtailment")
axs2[1].set_xticks(x); axs2[1].set_xticklabels(B_years)
axs2[1].set_ylabel("Energy gap (MWh)")
axs2[1].set_title("Loss & curtailment both material  (2025 unreliable)")
axs2[1].axvspan(4.5, 5.5, color=MUTED, alpha=0.18)
axs2[1].legend(frameon=False, fontsize=11); style(axs2[1])
fig2.suptitle("PLANT B  ·  107 inverters  ·  frozen healthy-2018 twin", fontsize=12, color="#64748b", y=1.02)
fig2.tight_layout()
fig2.savefig(OUT/"plant_b_charts.png", dpi=150, bbox_inches="tight")
print("saved", OUT/"plant_b_charts.png")
