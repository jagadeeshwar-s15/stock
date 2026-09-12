"""Execute the analysis notebook top to bottom and verify what it produced.

The notebook is the single source of truth: it computes every number, writes
the CSV/PNG artifacts and the ``results/dashboard.json`` file that the web
dashboard renders. This script only runs it headlessly and checks the output.

Usage (from the ``ml/`` directory, with the virtual environment active):

    python run_pipeline.py            # re-run on the committed data snapshot
    python run_pipeline.py --refresh  # re-download the configured window first
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
import time
from pathlib import Path

import nbformat
from nbclient import NotebookClient

if sys.platform == "win32":
    # pyzmq cannot use the Proactor loop's reader API; on Windows the default
    # policy can stall while collecting kernel messages. The selector loop is
    # the fix recommended by pyzmq itself.
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

PROJECT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_DIR))

from src import config  # noqa: E402

EXPECTED_ARTIFACTS = [
    "four_way_comparison.csv",
    "class_balance.csv",
    "test_predictions.csv",
    "leakage_checks.csv",
    "actual_vs_predicted_direction.png",
    "dashboard.json",
]


def execute_notebook(path: Path, timeout: int) -> nbformat.NotebookNode:
    notebook = nbformat.read(path, as_version=4)
    client = NotebookClient(
        notebook,
        timeout=timeout,
        kernel_name="python3",
        record_timing=False,
        resources={"metadata": {"path": str(path.parent)}},
    )
    client.execute()
    nbformat.write(notebook, path)
    return notebook


def verify_outputs(notebook: nbformat.NotebookNode) -> list[str]:
    problems: list[str] = []
    missing = [name for name in EXPECTED_ARTIFACTS if not (config.RESULTS_DIR / name).exists()]
    if missing:
        problems.append(f"missing artifacts: {', '.join(missing)}")
        return problems

    payload = json.loads(config.DASHBOARD_FILE.read_text(encoding="utf-8"))
    failed = [c["name"] for c in payload["leakageChecks"] if not c["passed"]]
    if failed:
        problems.append(f"leakage checks failed: {', '.join(failed)}")

    summary = next(
        (cell.source for cell in notebook.cells
         if cell.cell_type == "markdown" and "Executive Summary" in cell.source),
        "",
    )
    stale = [
        row["label"] for row in payload["results"]["approaches"]
        if f"{row['accuracy']:.2%}" not in summary
    ]
    if stale:
        problems.append(
            "the Executive Summary quotes accuracies that differ from this run for: "
            + ", ".join(stale) + " (update the markdown cell)"
        )
    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--refresh", action="store_true", help="re-download the data snapshot before running")
    parser.add_argument("--timeout", type=int, default=900, help="per-cell timeout in seconds")
    args = parser.parse_args()

    if args.refresh:
        os.environ[config.REFRESH_ENV_VAR] = "1"  # inherited by the notebook kernel

    started = time.perf_counter()
    print(f"Executing {config.NOTEBOOK_PATH.relative_to(PROJECT_DIR)} ...", flush=True)
    notebook = execute_notebook(config.NOTEBOOK_PATH, args.timeout)
    print(f"Notebook executed without errors in {time.perf_counter() - started:.1f} s")

    problems = verify_outputs(notebook)
    payload = json.loads(config.DASHBOARD_FILE.read_text(encoding="utf-8"))
    print(f"\nDataset: {payload['dataset']['name']} ({payload['dataset']['ticker']}), "
          f"{payload['dataset']['firstDate']} to {payload['dataset']['lastDate']}, "
          f"{payload['dataset']['usableRows']:,} usable rows")
    print(f"Test window: {payload['split']['test']['start']} to {payload['split']['test']['end']}")
    for row in payload["results"]["approaches"]:
        print(f"  {row['label']:<20} accuracy {row['accuracy']:.2%}   F1 {row['f1']:.3f}")
    passed = sum(c["passed"] for c in payload["leakageChecks"])
    print(f"Leakage checks passed: {passed}/{len(payload['leakageChecks'])}")

    if problems:
        print("\nVerification problems:")
        for problem in problems:
            print(f"  - {problem}")
        return 1
    print("\nAll artifacts written to results/ and verified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
