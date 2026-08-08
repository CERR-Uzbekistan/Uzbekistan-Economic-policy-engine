#!/usr/bin/env python3
"""Automated reform pipeline — fetches, categorizes, and updates policy tracker.

Run standalone:
    cd mcp_server
    py scripts/run_reforms_update.py

Requires:
    - httpx (pip install httpx)
    - ANTHROPIC_API_KEY environment variable (for AI categorization step)
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
    from tools.reforms import fetch_reforms, categorize_reform, update_tracker_file

    api_key = os.getenv("ANTHROPIC_API_KEY")
    sources = ["lex_uz", "cbu", "wto"]
    all_reforms = []
    report = []

    # Step 1: Fetch from all sources
    print(f"{'='*50}")
    print("  FETCHING POLICY REFORMS")
    print(f"{'='*50}")

    for source in sources:
        print(f"\n  [{source}] Fetching documents...")
        fetch_result = await fetch_reforms(source=source, limit=15)

        if "error" in fetch_result:
            print(f"  ERROR: {fetch_result['error']}")
            report.append(f"{source}: fetch error — {fetch_result['error']}")
            continue

        docs = fetch_result.get("documents", [])
        valid_docs = [d for d in docs if d.get("raw_text") and not d.get("error")]
        print(f"  Found {len(valid_docs)} documents from {source}")
        report.append(f"{source}: {len(valid_docs)} documents found")

        # Step 2: Categorize each document (AI if key available, keyword fallback otherwise)
        if valid_docs:
            mode = "AI" if api_key else "keyword-matching"
            print(f"  Categorizing {len(valid_docs)} documents via {mode}...")
            for i, doc in enumerate(valid_docs):
                print(f"    [{i+1}/{len(valid_docs)}] {doc.get('title', 'Untitled')[:60]}...")
                cat_result = await categorize_reform(
                    raw_text=doc["raw_text"],
                    source=source,
                    api_key=api_key,
                )
                if "reform" in cat_result:
                    all_reforms.append(cat_result["reform"])
                elif "error" in cat_result:
                    print(f"    WARNING: {cat_result['error']}")

    if not all_reforms:
        print("\n  No reforms to update.")
        print(f"\n{'='*50}")
        print("  REFORM UPDATE COMPLETE — 0 new reforms")
        print(f"{'='*50}")
        for line in report:
            print(f"    {line}")
        return {"total_added": 0, "report": report}

    # Step 3: Update tracker data file
    print(f"\n{'='*50}")
    print("  UPDATING TRACKER FILE")
    print(f"{'='*50}")
    print(f"  Merging {len(all_reforms)} reforms into policy-tracker-data.js...")

    update_result = await update_tracker_file(all_reforms, SHARED_DIR)

    if "error" in update_result:
        print(f"  ERROR: {update_result['error']}")
        report.append(f"Update error: {update_result['error']}")
        total_added = 0
    else:
        total_added = update_result.get("added", 0)
        skipped = update_result.get("skipped", 0)
        print(f"  Added {total_added} new reforms, skipped {skipped} duplicates")
        report.append(f"Result: +{total_added} added, {skipped} skipped")
        if update_result.get("reforms_added"):
            for title in update_result["reforms_added"]:
                print(f"    + {title}")

    # Summary
    print(f"\n{'='*50}")
    print("  REFORM UPDATE COMPLETE")
    print(f"{'='*50}")
    print(f"  Total new reforms added: {total_added}")
    for line in report:
        print(f"    {line}")

    return {"total_added": total_added, "report": report}


if __name__ == "__main__":
    result = asyncio.run(run_full_pipeline())
    sys.exit(0 if result["total_added"] >= 0 else 1)
