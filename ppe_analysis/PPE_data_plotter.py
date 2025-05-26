import os
import re
from collections import Counter, defaultdict
from datetime import datetime

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib.patches import Patch
from matplotlib import gridspec

# -----------------------------------------------------------------------------
# Constants & Colours
# -----------------------------------------------------------------------------
LOW_THRESHOLD = 100
HIGH_THRESHOLD = 1000

GREEN_FILL = (0.80, 1.00, 0.80, 1)   # > 1000
YELLOW_FILL = (1.00, 1.00, 0.70, 1)  # 100‑1000
RED_FILL   = (1.00, 0.80, 0.80, 1)   # < 100
TRANSPARENT = (1.0, 1.0, 1.0, 0)

# -----------------------------------------------------------------------------
# Utility helpers
# -----------------------------------------------------------------------------

def parse_filename(filename: str):
    m = re.match(r"([^_]+)_([^._]+)\._Action_([^.]+)\.csv", filename)
    return m.groups() if m else (None, None, None)


def time_to_seconds(t: str):
    try:
        dt = datetime.strptime(t, "%H:%M:%S")
        return dt.hour * 3600 + dt.minute * 60 + dt.second
    except Exception:
        return None


def get_user_selection(prompt: str, options: set[str]):
    print(f"\n{prompt}\nAvailable: {', '.join(sorted(options))}")
    resp = input("(comma‑sep, 'all', 'none'): ").strip().lower()
    if resp == "all":
        return options
    if resp in {"none", ""}:
        return set()
    mapping = {o.lower(): o for o in options}
    sel = {mapping[x.strip().lower()] for x in resp.split(',') if x.strip().lower() in mapping}
    return sel


def build_colour_maps():
    return {
        "3M62006035": plt.cm.Blues,
        "3M6200P100": plt.cm.Oranges,
        "EMProML": plt.cm.Greens,
        "EMProS": plt.cm.Reds,
        "FFP3": plt.cm.Purples,
        "Versaflo": plt.cm.YlOrBr,
    }

MASK_CMAPS = build_colour_maps()


def brightness(rgba):
    r, g, b, _ = rgba
    return 0.299 * r + 0.587 * g + 0.114 * b

# -----------------------------------------------------------------------------
# Core processing – returns dict[action] = (people, masks, cell_text, cell_colors)
# -----------------------------------------------------------------------------

def process_files(files: list[tuple[str, str, str, str]]):
    result = {}
    by_action: defaultdict[str, list[tuple[str, str, str, str]]] = defaultdict(list)
    for fp, person, mask, action in files:
        by_action[action].append((fp, person, mask, action))

    for action, grp in by_action.items():
        # Track means
        mask_counts = Counter(m for _, _, m, _ in grp)
        cell_means = defaultdict(list)
        mask_idx = defaultdict(int)
        people_set, masks_set = set(), set()

        # For plotting later
        series = []  # list of dicts with df, person, mask, colour, mean

        for fp, person, mask, _ in grp:
            df = pd.read_csv(fp)
            if not {"Time", "FitFactor"}.issubset(df.columns):
                continue
            df["Seconds"] = df["Time"].apply(time_to_seconds)
            df.dropna(subset=["Seconds", "FitFactor"], inplace=True)
            df = df[df["FitFactor"] > 0]
            if df.empty:
                continue
            df["RelSec"] = df["Seconds"] - df["Seconds"].min()
            mean_val = df["FitFactor"].mean()
            cmap = MASK_CMAPS.get(mask, plt.cm.tab20)
            n = mask_counts[mask]
            shade = 0.6 if n == 1 else 0.3 + 0.6 * (mask_idx[mask] / (n - 1))
            colour = cmap(shade)
            mask_idx[mask] += 1

            series.append(dict(df=df, person=person, mask=mask, colour=colour, mean=mean_val))
            cell_means[(person, mask)].append(mean_val)
            people_set.add(person)
            masks_set.add(mask)

        # Build table arrays
        people_sorted = sorted(people_set)
        masks_sorted = sorted(masks_set, key=lambda m: list(MASK_CMAPS).index(m) if m in MASK_CMAPS else m)
        cell_text, cell_colors = [], []
        for p in people_sorted:
            row_t, row_c = [], []
            for m in masks_sorted:
                if (p, m) in cell_means:
                    val = float(np.mean(cell_means[(p, m)]))
                    row_t.append(f"{val:.0f}")
                    if val > HIGH_THRESHOLD:
                        row_c.append(GREEN_FILL)
                    elif val < LOW_THRESHOLD:
                        row_c.append(RED_FILL)
                    else:
                        row_c.append(YELLOW_FILL)
                else:
                    row_t.append("")
                    row_c.append(TRANSPARENT)
            cell_text.append(row_t)
            cell_colors.append(row_c)

        result[action] = dict(series=series,
                              people=people_sorted,
                              masks=masks_sorted,
                              cell_text=cell_text,
                              cell_colors=cell_colors)
    return result

# -----------------------------------------------------------------------------
# Plotting modes
# -----------------------------------------------------------------------------

def show_plots(processed):
    for action, data in processed.items():
        fig, ax = plt.subplots(figsize=(12, 8))
        ax.set_title(f"Fit Factor vs Time – {action}")
        ax.set_xlabel("Time (s)")
        ax.set_ylabel("Fit Factor")
        ax.set_yscale("log")
        ax.grid(True, which="both", alpha=0.3)

        # Plot series
        for s in data["series"]:
            ax.semilogy(s["df"]["RelSec"], s["df"]["FitFactor"],
                        marker="o", markersize=3, linewidth=1.5, alpha=0.85,
                        color=s["colour"],
                        label=f"{s['person']}_{s['mask']} (μ={s['mean']:.1f})")

        # Colour legend
        masks_present = data["masks"]
        handles = [Patch(facecolor=MASK_CMAPS.get(m, plt.cm.tab20)(0.6), edgecolor='none') for m in masks_present]
        ax.legend(handles, masks_present, title="Mask Colours", loc="upper right")

        # Table
        table_ax = fig.add_axes([0.82, 0.15, 0.16, 0.7])
        table_ax.axis("off")
        tbl = table_ax.table(cellText=data["cell_text"], cellColours=data["cell_colors"],
                              rowLabels=data["people"], colLabels=masks_present,
                              cellLoc="center", loc="center")
        tbl.scale(1, 1.5)
        plt.tight_layout(rect=[0,0,0.8,1])
    plt.show()


def show_tables_only(processed):
    n = len(processed)
    # single window with n rows of tables (no plots)
    fig = plt.figure(figsize=(10, 2.5*n))
    gs = gridspec.GridSpec(n, 1, hspace=0.8)

    for idx, (action, data) in enumerate(processed.items()):
        ax = fig.add_subplot(gs[idx])
        ax.axis("off")
        ax.set_title(action, loc='left', fontsize=12, fontweight='bold')
        tbl = ax.table(cellText=data["cell_text"], cellColours=data["cell_colors"],
                       rowLabels=data["people"], colLabels=data["masks"],
                       cellLoc='center', loc='center')
        tbl.scale(1, 1.3)
        for (_row, _col), cell in tbl.get_celld().items():
            face = cell.get_facecolor()
            if face[-1] == 0:
                continue
            cell.get_text().set_color('black' if brightness(face) > 0.5 else 'white')
    plt.show()

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

def main():
    data_dir = "Data"
    if not os.path.isdir(data_dir):
        print(f"❌ '{data_dir}' directory not found (cwd = {os.getcwd()})")
        return

    files = []
    people, masks, actions = set(), set(), set()
    for fname in os.listdir(data_dir):
        if not fname.lower().endswith('.csv'):
            continue
        p, m, a = parse_filename(fname)
        if p and m and a:
            files.append((os.path.join(data_dir, fname), p, m, a))
            people.add(p)
            masks.add(m)
            actions.add(a)
    if not files:
        print("No CSV files found matching pattern.")
        return

    sel_people = get_user_selection("Select PEOPLE", people)
    if not sel_people:
        print("No people selected – exiting.")
        return
    sel_masks = get_user_selection("Select MASKS", masks)
    if not sel_masks:
        print("No masks selected – exiting.")
        return
    sel_actions = get_user_selection("Select EXERCISES", actions)
    if not sel_actions:
        print("No exercises selected – exiting.")
        return

    sel_files = [f for f in files if f[1] in sel_people and f[2] in sel_masks and f[3] in sel_actions]
    if not sel_files:
        print("No files match selection.")
        return

    mode = input("\nView mode: 'plots' (default) or 'tables'? ").strip().lower()
    tables_only = mode in {"tables", "table", "t"}

    processed = process_files(sel_files)

    if tables_only:
        show_tables_only(processed)
    else:
        show_plots(processed)


if __name__ == "__main__":
    main()
