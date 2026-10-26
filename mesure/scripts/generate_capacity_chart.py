#!/usr/bin/env python3
"""Rebuild the report's capacity chart from archived JMeter summaries.

From the repository root:
  uv run --no-project --with matplotlib==3.10.7 python mesure/scripts/generate_capacity_chart.py
"""

import csv
import hashlib
import json
import math
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter


ROOT = Path(__file__).resolve().parents[2]
CAMPAIGN = ROOT / "mesure/preuves/capacite-20261018-195024-455892"
OUTPUT = ROOT / "mesure/docs/courbes"


def read_measurements():
    rows = []
    for series in (1, 2):
        for deployment in ("vm", "docker"):
            paths = sorted(
                (CAMPAIGN / f"serie-{series}" / deployment).glob("*/synthese.json"),
                key=lambda path: int(path.parent.name),
            )
            if not paths:
                raise ValueError(f"Missing measurements: {series}, {deployment}")
            for path in paths:
                raw = path.read_bytes()
                sample = json.loads(raw)
                users = sample["users"]
                effective = sample["effective_users"]
                valid = sample["plateau_valid"]
                p95 = sample["p95_ms"]
                if users != int(path.parent.name):
                    raise ValueError(f"User count disagrees with source path: {path}")
                if not math.isfinite(p95) or p95 < 0:
                    raise ValueError(f"Invalid p95: {path}")
                if valid and effective != [users]:
                    raise ValueError(f"A valid plateau must maintain the requested load: {path}")
                rows.append({
                    "deployment": deployment,
                    "series": series,
                    "requested_users": users,
                    "effective_users": ";".join(map(str, effective)),
                    "plateau_valid": valid,
                    "p95_ms": p95,
                    "all_errors": sample["all_errors"],
                    "source": path.relative_to(ROOT).as_posix(),
                    "source_sha256": hashlib.sha256(raw).hexdigest(),
                })
    return rows


def main():
    rows = read_measurements()
    protocol = json.loads((CAMPAIGN / "protocole.json").read_text())
    threshold = protocol["capacite"]["p95_max_ms"]
    OUTPUT.mkdir(parents=True, exist_ok=True)
    stem = OUTPUT / "capacity-p95"
    with stem.with_suffix(".csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]), lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)

    plt.rcParams.update({
        "font.family": "DejaVu Sans", "font.size": 10,
        "axes.labelcolor": "#263238", "text.color": "#263238",
        "axes.edgecolor": "#b0bec5", "pdf.fonttype": 42,
    })
    fig, ax = plt.subplots(figsize=(8.8, 4.9))
    fig.subplots_adjust(left=.10, right=.97, bottom=.23, top=.88)
    for deployment, title, color in (("vm", "VM", "#c25322"), ("docker", "Docker", "#226898")):
        for series, style, marker in ((1, "-", "o"), (2, "--", "s")):
            points = [row for row in rows if row["deployment"] == deployment
                      and row["series"] == series and row["plateau_valid"]]
            ax.plot([row["requested_users"] for row in points],
                    [row["p95_ms"] for row in points],
                    color=color, linestyle=style, marker=marker, linewidth=1.65,
                    markersize=4.2, markerfacecolor="white" if series == 2 else color,
                    label=f"{title} - série {series}")
    ax.axhline(threshold, color="#7a3030", linestyle=(0, (5, 4)), linewidth=1.15)
    ax.text(3, threshold + 22, f"Seuil de service : {threshold:,.0f} ms".replace(",", " "),
            color="#7a3030", fontsize=9)
    ax.set(xlim=(0, 207), ylim=(0, max(threshold * 1.16,
           max(row["p95_ms"] for row in rows if row["plateau_valid"]) * 1.1)),
           xlabel="Utilisateurs simultanés maintenus pendant le plateau",
           ylabel="Temps de réponse p95 (ms)")
    ax.set_xticks(range(0, 201, 20))
    ax.yaxis.set_major_formatter(FuncFormatter(lambda value, _: f"{value:,.0f}".replace(",", " ")))
    ax.grid(axis="y", color="#e2e7eb", linewidth=.7)
    ax.set_axisbelow(True)
    ax.spines[["top", "right"]].set_visible(False)
    ax.legend(loc="upper left", bbox_to_anchor=(0, .79), frameon=False, fontsize=9)
    fig.suptitle("Montée en charge - consultation des candidatures", x=.10, ha="left",
                 fontsize=13, fontweight="bold", y=.98)
    fig.text(.10, .92, "Campagne de capacité · p95 des consultations sur 120 s",
             fontsize=9, color="#53616a")
    excluded = [row for row in rows if not row["plateau_valid"]]
    exclusions = ", ".join(f"{row['deployment'].capitalize()} S{row['series']} à {row['requested_users']}"
                           for row in excluded)
    fig.text(.10, .105, f"Plateaux incomplets exclus : {exclusions} utilisateurs.", fontsize=8)
    fig.text(.10, .062, "Répétitions séparées, sans moyenne des p95. Injecteur et serveur sur le même hôte.", fontsize=8)
    fig.text(.10, .025, "Un plateau complet ne suffit pas à valider une capacité maximale reproductible.", fontsize=8)
    fig.savefig(stem.with_suffix(".pdf"), metadata={"CreationDate": None, "ModDate": None})
    fig.savefig(stem.with_suffix(".png"), dpi=220)
    plt.close(fig)
    print(f"{len(rows) - len(excluded)} points tracés ; {len(excluded)} plateaux exclus ; {len(rows)} sources dans le CSV.")
    print(stem.relative_to(ROOT))


if __name__ == "__main__":
    main()
