#!/usr/bin/env python3
"""Automated literature pipeline — fetches, curates, and updates academic papers.

Run standalone:
    cd mcp_server
    py scripts/run_literature_update.py

Requires:
    - httpx (pip install httpx)
    - ANTHROPIC_API_KEY environment variable (for AI curation step)
"""

import asyncio
import os
import sys
from pathlib import Path

# Ensure mcp_server/ is on sys.path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

SHARED_DIR = str(ROOT.parent / "shared")


async def run_full_pipeline():
    from tools.literature import fetch_papers, curate_papers, update_literature_file

    api_key = os.getenv("ANTHROPIC_API_KEY")
    models = ["qpm", "dfm", "cge", "io", "pe", "fpp"]
    total_added = 0
    report = []

    for model_id in models:
        print(f"\n{'='*50}")
        print(f"  Processing model: {model_id.upper()}")
        print(f"{'='*50}")

        # Step 1: Fetch candidates
        print(f"  [1/3] Fetching papers from Semantic Scholar & OpenAlex...")
        fetch_result = await fetch_papers(model_id=model_id, max_results=10)

        if "error" in fetch_result:
            print(f"  ERROR: {fetch_result['error']}")
            report.append(f"{model_id.upper()}: fetch error — {fetch_result['error']}")
            continue

        candidates = fetch_result.get("candidates", [])
        print(f"  Found {len(candidates)} candidate papers")

        if not candidates:
            report.append(f"{model_id.upper()}: 0 candidates found")
            continue

        # Step 2: Curate with AI (skip if no API key)
        if api_key:
            print(f"  [2/3] AI-curating {len(candidates)} papers (relevance threshold >= 6)...")
            curate_result = await curate_papers(candidates, model_id, api_key=api_key)

            if "error" in curate_result:
                print(f"  WARNING: Curation failed — {curate_result['error']}")
                print(f"  Falling back to top papers by citation count...")
                accepted = candidates[:5]
            else:
                accepted = curate_result.get("curated", [])
                meta = curate_result.get("meta", {})
                print(f"  Scored {meta.get('total_scored', 0)} papers, accepted {meta.get('accepted', 0)}")
        else:
            print(f"  [2/3] No ANTHROPIC_API_KEY — skipping AI curation, using top 5 by citations...")
            accepted = candidates[:5]

        if not accepted:
            report.append(f"{model_id.upper()}: 0 papers passed curation")
            continue

        # Step 3: Update data file
        print(f"  [3/3] Merging {len(accepted)} papers into literature-data.js...")
        update_result = await update_literature_file(accepted, SHARED_DIR)

        if "error" in update_result:
            print(f"  ERROR: {update_result['error']}")
            report.append(f"{model_id.upper()}: update error — {update_result['error']}")
        else:
            added = update_result.get("added", 0)
            skipped = update_result.get("skipped", 0)
            total_added += added
            print(f"  Added {added} new papers, skipped {skipped} duplicates")
            report.append(f"{model_id.upper()}: +{added} added, {skipped} skipped")

    # Summary
    print(f"\n{'='*50}")
    print(f"  LITERATURE UPDATE COMPLETE")
    print(f"{'='*50}")
    print(f"  Total new papers added: {total_added}")
    for line in report:
        print(f"    {line}")

    return {"total_added": total_added, "report": report}


if __name__ == "__main__":
    result = asyncio.run(run_full_pipeline())
    sys.exit(0 if result["total_added"] >= 0 else 1)
