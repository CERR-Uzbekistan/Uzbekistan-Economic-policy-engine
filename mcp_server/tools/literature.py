"""Literature pipeline tools — fetch, curate, and update academic papers.

Queries Semantic Scholar and OpenAlex APIs for papers relevant to each economic
model, uses Claude to score relevance and generate summaries, then merges into
shared/literature-data.js.
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path

logger = logging.getLogger("uz-policy-mcp.literature")

# Model-specific search keywords for academic paper discovery
MODEL_KEYWORDS: dict[str, list[str]] = {
    "qpm": [
        "DSGE small open economy",
        "monetary policy transmission developing",
        "New-Keynesian quarterly projection model",
        "inflation targeting central bank",
    ],
    "dfm": [
        "dynamic factor model GDP nowcasting",
        "Kalman filter mixed frequency",
        "real-time GDP forecasting monthly indicators",
    ],
    "cge": [
        "computable general equilibrium developing countries",
        "1-2-3 model trade liberalization",
        "Armington elasticity CET CES",
    ],
    "io": [
        "input-output analysis Leontief multiplier",
        "sectoral multiplier developing economy",
        "supply chain linkages inter-industry",
    ],
    "pe": [
        "partial equilibrium trade liberalization",
        "SMART WITS tariff simulation",
        "WTO accession impact assessment",
    ],
    "fpp": [
        "IMF financial programming macroeconomic",
        "four-sector macroeconomic framework",
        "fiscal monetary consistency developing",
    ],
}


async def fetch_papers(
    model_id: str = "all",
    keywords: str | None = None,
    max_results: int = 20,
) -> dict:
    """Fetch candidate academic papers from Semantic Scholar and OpenAlex APIs.

    Args:
        model_id: Model to search for ("qpm", "dfm", "cge", "io", "pe", "fpp", or "all").
        keywords: Custom search keywords. If None, uses built-in model-specific keywords.
        max_results: Maximum papers to return per query (5 to 50).

    Returns:
        Dict with "candidates" list and "meta" info.
    """
    import httpx

    max_results = max(5, min(50, max_results))
    valid_models = list(MODEL_KEYWORDS.keys())

    if model_id == "all":
        target_models = valid_models
    elif model_id in valid_models:
        target_models = [model_id]
    else:
        return {"error": f"Invalid model_id. Must be one of: {valid_models + ['all']}"}

    candidates = []
    seen_titles: set[str] = set()

    async with httpx.AsyncClient(timeout=30.0) as client:
        for mid in target_models:
            queries = [keywords] if keywords else MODEL_KEYWORDS[mid]
            for query in queries:
                # --- Semantic Scholar ---
                try:
                    resp = await client.get(
                        "https://api.semanticscholar.org/graph/v1/paper/search",
                        params={
                            "query": query,
                            "limit": min(max_results, 10),
                            "fields": "title,authors,year,venue,externalIds,abstract,citationCount",
                        },
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        for p in data.get("data", []):
                            title = (p.get("title") or "").strip()
                            if not title or title.lower() in seen_titles:
                                continue
                            seen_titles.add(title.lower())
                            doi = (p.get("externalIds") or {}).get("DOI", "")
                            authors = ", ".join(
                                a.get("name", "") for a in (p.get("authors") or [])
                            )
                            candidates.append({
                                "title": title,
                                "authors": authors,
                                "year": p.get("year"),
                                "venue": p.get("venue", ""),
                                "doi": doi,
                                "abstract": (p.get("abstract") or "")[:500],
                                "citations": p.get("citationCount", 0),
                                "source": "semantic_scholar",
                                "model": mid,
                            })
                except Exception as e:
                    logger.warning("Semantic Scholar query failed for '%s': %s", query, e)

                # --- OpenAlex ---
                try:
                    resp = await client.get(
                        "https://api.openalex.org/works",
                        params={
                            "search": query,
                            "per_page": min(max_results, 10),
                            "select": "title,authorships,publication_year,primary_location,doi,abstract_inverted_index",
                        },
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        for w in data.get("results", []):
                            title = (w.get("title") or "").strip()
                            if not title or title.lower() in seen_titles:
                                continue
                            seen_titles.add(title.lower())
                            doi = (w.get("doi") or "").replace("https://doi.org/", "")
                            authors = ", ".join(
                                (a.get("author") or {}).get("display_name", "")
                                for a in (w.get("authorships") or [])[:6]
                            )
                            # Reconstruct abstract from inverted index
                            abstract = _reconstruct_abstract(
                                w.get("abstract_inverted_index")
                            )
                            venue = ""
                            loc = w.get("primary_location") or {}
                            src = loc.get("source") or {}
                            venue = src.get("display_name", "")

                            candidates.append({
                                "title": title,
                                "authors": authors,
                                "year": w.get("publication_year"),
                                "venue": venue,
                                "doi": doi,
                                "abstract": abstract[:500],
                                "citations": 0,
                                "source": "openalex",
                                "model": mid,
                            })
                except Exception as e:
                    logger.warning("OpenAlex query failed for '%s': %s", query, e)

    # Sort by citations descending, then year descending
    candidates.sort(key=lambda c: (-(c.get("citations") or 0), -(c.get("year") or 0)))

    return {
        "candidates": candidates[:max_results * len(target_models)],
        "meta": {
            "models_searched": target_models,
            "total_found": len(candidates),
            "sources": ["semantic_scholar", "openalex"],
        },
    }


async def curate_papers(
    candidates: list[dict],
    model_id: str,
    api_key: str | None = None,
) -> dict:
    """Score and curate candidate papers for relevance using Claude API.

    Args:
        candidates: List of paper dicts from fetch_papers.
        model_id: Model context for relevance scoring.
        api_key: Anthropic API key. If None, uses ANTHROPIC_API_KEY env var.

    Returns:
        Dict with "curated" list (papers scoring >= 6) and "meta" info.
    """
    import os

    import httpx

    api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return {"error": "No API key. Set ANTHROPIC_API_KEY environment variable."}

    if not candidates:
        return {"curated": [], "meta": {"total_scored": 0, "accepted": 0}}

    # Build prompt with paper list
    paper_list = "\n".join(
        f"{i+1}. \"{p['title']}\" ({p.get('year','?')}) by {p.get('authors','?')} "
        f"— {p.get('abstract','')[:200]}"
        for i, p in enumerate(candidates[:30])  # Cap at 30 for prompt size
    )

    model_descriptions = {
        "qpm": "New-Keynesian DSGE quarterly projection model for monetary policy (IS curve, Phillips curve, Taylor rule, UIP)",
        "dfm": "Dynamic Factor Model for GDP nowcasting with Kalman filter and mixed-frequency indicators",
        "cge": "Computable General Equilibrium 1-2-3 model with CET/CES trade structure",
        "io": "Input-Output Leontief model with 136 sectors for supply chain multiplier analysis",
        "pe": "Partial Equilibrium WITS-SMART model for WTO accession trade impact simulation",
        "fpp": "IMF Financial Programming & Policies framework with 4-sector consistency checks",
    }

    prompt = f"""Score each paper 0-10 for relevance to the Uzbekistan Economic Policy Engine's {model_id.upper()} model:
{model_descriptions.get(model_id, model_id)}

Papers:
{paper_list}

For each paper, respond in JSON array format:
[{{"index": 1, "score": 8, "relevance_en": "Two-sentence relevance note in English.", "relevance_ru": "То же на русском.", "relevance_uz": "O'zbek tilida.", "topics": ["monetary", "calibration"]}}]

Only include papers scoring >= 6. Topics should be from: monetary, fiscal, trade, growth, inflation, structural, methodology, calibration, forecasting."""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-sonnet-4-20250514",
                    "max_tokens": 4096,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            if resp.status_code != 200:
                return {"error": f"Claude API returned {resp.status_code}: {resp.text[:200]}"}

            result = resp.json()
            text = result["content"][0]["text"]

            # Extract JSON from response
            json_match = re.search(r"\[.*\]", text, re.DOTALL)
            if not json_match:
                return {"error": "Could not parse Claude response as JSON array."}

            scored = json.loads(json_match.group())
    except Exception as e:
        return {"error": f"Curation failed: {e}"}

    # Merge scores back into candidates
    curated = []
    for entry in scored:
        idx = entry.get("index", 0) - 1
        if 0 <= idx < len(candidates) and entry.get("score", 0) >= 6:
            paper = dict(candidates[idx])
            paper["relevance_score"] = entry["score"]
            paper["relevance"] = {
                "en": entry.get("relevance_en", ""),
                "ru": entry.get("relevance_ru", ""),
                "uz": entry.get("relevance_uz", ""),
            }
            paper["topics"] = entry.get("topics", [])
            curated.append(paper)

    curated.sort(key=lambda c: -c.get("relevance_score", 0))

    return {
        "curated": curated,
        "meta": {
            "model": model_id,
            "total_scored": len(scored),
            "accepted": len(curated),
            "threshold": 6,
        },
    }


async def update_literature_file(
    new_papers: list[dict],
    shared_dir: str,
) -> dict:
    """Merge new curated papers into shared/literature-data.js.

    Deduplicates by DOI and title. Preserves existing papers.

    Args:
        new_papers: List of curated paper dicts from curate_papers.
        shared_dir: Absolute path to the shared/ directory.

    Returns:
        Dict with counts of added/skipped papers.
    """
    lit_path = Path(shared_dir) / "literature-data.js"
    if not lit_path.exists():
        return {"error": f"File not found: {lit_path}"}

    content = lit_path.read_text(encoding="utf-8")

    # Parse existing papers to build dedup index
    existing_dois: set[str] = set()
    existing_titles: set[str] = set()
    for m in re.finditer(r'doi:\s*"([^"]+)"', content):
        existing_dois.add(m.group(1).lower())
    for m in re.finditer(r'title:\s*"([^"]+)"', content):
        existing_titles.add(m.group(1).lower().strip())

    added = []
    skipped = 0
    for paper in new_papers:
        doi = (paper.get("doi") or "").lower()
        title = (paper.get("title") or "").lower().strip()

        if (doi and doi in existing_dois) or (title and title in existing_titles):
            skipped += 1
            continue

        # Generate a slug ID
        slug = re.sub(r"[^a-z0-9]+", "-", title[:40]).strip("-")
        year = paper.get("year", "")
        paper_id = f"{slug}-{year}"

        # Format authors: "Last, F., Last, F."
        authors = paper.get("authors", "")

        relevance = paper.get("relevance", {})
        if isinstance(relevance, str):
            relevance = {"en": relevance, "ru": relevance, "uz": relevance}

        entry = {
            "id": paper_id,
            "model": paper.get("model", ""),
            "topic": (paper.get("topics") or ["methodology"])[0],
            "title": paper.get("title", ""),
            "authors": authors,
            "year": paper.get("year"),
            "venue": paper.get("venue", ""),
            "doi": paper.get("doi", ""),
            "abstract": paper.get("abstract", ""),
            "relevance": relevance,
        }
        added.append(entry)

    if not added:
        return {"added": 0, "skipped": skipped, "message": "No new papers to add."}

    # Build JS entries to insert
    new_entries_js = ""
    for e in added:
        rel = e["relevance"]
        new_entries_js += f"""    {{
      id: "{_js_esc(e['id'])}",
      model: "{_js_esc(e['model'])}",
      topic: "{_js_esc(e['topic'])}",
      title: "{_js_esc(e['title'])}",
      authors: "{_js_esc(e['authors'])}",
      year: {e['year'] or 'null'},
      venue: "{_js_esc(e['venue'])}",
      doi: "{_js_esc(e.get('doi',''))}",
      abstract: "{_js_esc(e['abstract'])}",
      relevance: {{
        en: "{_js_esc(rel.get('en',''))}",
        ru: "{_js_esc(rel.get('ru',''))}",
        uz: "{_js_esc(rel.get('uz',''))}",
      }},
    }},
"""

    # Insert before the closing "]" of the papers array
    # Find the last entry and insert after it
    insert_pos = content.rfind("},\n  ],")
    if insert_pos == -1:
        insert_pos = content.rfind("},\n  ]")
    if insert_pos == -1:
        return {"error": "Could not find insertion point in literature-data.js"}

    # Insert after the last "},"
    insert_after = content.index("\n", insert_pos) + 1
    updated = content[:insert_after] + new_entries_js + content[insert_after:]

    # Update meta version and date
    updated = re.sub(
        r'lastUpdated:\s*"[^"]*"',
        f'lastUpdated: "{_today()}"',
        updated,
        count=1,
    )

    lit_path.write_text(updated, encoding="utf-8")

    return {
        "added": len(added),
        "skipped": skipped,
        "papers_added": [p["title"] for p in added],
        "file": str(lit_path),
    }


def _reconstruct_abstract(inverted_index: dict | None) -> str:
    """Reconstruct abstract text from OpenAlex's inverted index format."""
    if not inverted_index:
        return ""
    word_positions: list[tuple[int, str]] = []
    for word, positions in inverted_index.items():
        for pos in positions:
            word_positions.append((pos, word))
    word_positions.sort()
    return " ".join(w for _, w in word_positions)


def _js_esc(s: str) -> str:
    """Escape a string for JS single/double-quoted literals."""
    return (s or "").replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ").replace("\r", "")


def _today() -> str:
    """Return today's date as YYYY-MM-DD."""
    from datetime import date
    return date.today().isoformat()
